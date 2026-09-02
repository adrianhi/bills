import { prisma } from '../../../config/database';
import type { CreateTransactionInput, UpdateTransactionInput } from '../../../schemas/transaction.schema';
import { normalizeTransactionStatus, transactionStatusLabel } from '../../../domain/transaction-status';
import type { TransactionWriter } from '../application/transaction-store.port';
import { resolveInstitutionCode } from '../domain/transaction-policy';
import { isFuzzyTransferMatch, mostCompleteMerchant } from '../domain/transaction-deduplication';
import { PrismaReversalService } from './prisma-reversal.service';
import { visibleTransactionWhere } from './income-visibility.where';
import { isIncomeMovement } from '../domain/transaction-policy';
import { AppError } from '../../../errors/app-error';

interface Categorizer {
  categorize(
    rawMerchant: string,
    merchant: string | null | undefined,
    category: string | null | undefined,
    workspaceId: string
  ): Promise<{ merchant: string; category: string; merchantKey?: string; merchantIdentityLabel?: string;
    categoryOrigin?: string; merchantOrigin?: string; categoryRuleId?: string | null; merchantRuleId?: string | null }>;
}

export class PrismaTransactionWriter implements TransactionWriter {
  public constructor(
    private readonly categorizer: Categorizer,
    private readonly reversals: PrismaReversalService
  ) {}

  public async create(workspaceId: string, data: CreateTransactionInput) {
    const txDate = new Date(data.transactionDate);
    const institutionCode = resolveInstitutionCode(data.institutionCode, data.source);
    const ingestionChannel = data.ingestionChannel || (data.source === 'MANUAL' ? 'MANUAL' : 'GMAIL_OAUTH');
    const statusCode = data.statusCode || normalizeTransactionStatus(data.status);
    const status = transactionStatusLabel(statusCode);
    if (statusCode === 'REVERSED') {
      const transaction = await this.reversals.apply(workspaceId, institutionCode, ingestionChannel, data);
      return { isDuplicate: true, transaction, statusUpdated: true };
    }

    const existing = await prisma.transaction.findUnique({
      where: { workspaceId_institutionCode_externalId: { workspaceId, institutionCode, externalId: data.externalId } },
    });
    if (existing) {
      const effectiveStatus = existing.statusCode === 'REVERSED' && statusCode === 'APPROVED' ? 'REVERSED' : statusCode;
      const transaction = await prisma.transaction.update({
        where: { id: existing.id },
        data: {
          transactionDate: txDate,
          amount: data.amount,
          currency: data.currency,
          classificationVersion: { increment: 1 },
          cardLast4: data.cardLast4 || existing.cardLast4,
          cardType: data.cardType || existing.cardType,
          transactionType: data.transactionType || existing.transactionType,
          notes: data.notes !== undefined ? data.notes : existing.notes,
          statusCode: effectiveStatus,
          status: transactionStatusLabel(effectiveStatus),
          statusUpdatedAt: effectiveStatus !== existing.statusCode ? txDate : existing.statusUpdatedAt,
        },
      });
      await this.reversals.recordStatusEvent(
        workspaceId, institutionCode, ingestionChannel, data, statusCode, transaction.id, 'MATCHED'
      );
      return { isDuplicate: true, transaction };
    }

    const candidates = await prisma.transaction.findMany({
      where: {
        workspaceId,
        institutionCode,
        amount: data.amount,
        currency: data.currency,
        transactionDate: {
          gte: new Date(txDate.getTime() - 10 * 60 * 1000),
          lte: new Date(txDate.getTime() + 10 * 60 * 1000),
        },
      },
    });
    for (const candidate of candidates) {
      if (!isFuzzyTransferMatch(candidate, data)) continue;
      const effectiveStatus = candidate.statusCode === 'REVERSED' && statusCode === 'APPROVED' ? 'REVERSED' : statusCode;
      const transaction = await prisma.transaction.update({
        where: { id: candidate.id },
        data: {
          ...(candidate.merchantOrigin === 'SYSTEM' ? { merchant: mostCompleteMerchant(candidate, data) } : {}),
          rawMerchant: data.rawMerchant.length > candidate.rawMerchant.length ? data.rawMerchant : candidate.rawMerchant,
          classificationVersion: { increment: 1 },
          notes: data.notes || candidate.notes,
          cardLast4: data.cardLast4 || candidate.cardLast4,
          transactionType: data.transactionType || candidate.transactionType,
          statusCode: effectiveStatus,
          status: transactionStatusLabel(effectiveStatus),
        },
      });
      await this.reversals.recordStatusEvent(
        workspaceId, institutionCode, ingestionChannel, data, statusCode, transaction.id, 'MATCHED'
      );
      return { isDuplicate: true, transaction };
    }

    const normalized: Awaited<ReturnType<Categorizer['categorize']>> = isIncomeMovement(data) ? { merchant: data.merchant || data.rawMerchant, category: data.category || 'Ingresos / Transferencias' } : await this.categorizer.categorize(
      data.rawMerchant, data.merchant, data.category, workspaceId
    );
    const transaction = await prisma.transaction.create({
      data: {
        workspaceId,
        institutionCode,
        ingestionChannel,
        externalId: data.externalId,
        cardLast4: data.cardLast4 || null,
        cardType: data.cardType || null,
        rawMerchant: data.rawMerchant,
        merchant: ingestionChannel === 'MANUAL' && data.merchant ? data.merchant : normalized.merchant,
        category: ingestionChannel === 'MANUAL' && data.category ? data.category : normalized.category,
        merchantKey: normalized.merchantKey,
        merchantIdentityLabel: normalized.merchantIdentityLabel,
        categoryOrigin: ingestionChannel === 'MANUAL' && data.category ? 'MANUAL' : normalized.categoryOrigin || 'SYSTEM',
        merchantOrigin: ingestionChannel === 'MANUAL' && data.merchant ? 'MANUAL' : normalized.merchantOrigin || 'SYSTEM',
        categoryRuleId: ingestionChannel === 'MANUAL' && data.category ? null : normalized.categoryRuleId,
        merchantRuleId: ingestionChannel === 'MANUAL' && data.merchant ? null : normalized.merchantRuleId,
        amount: data.amount,
        currency: data.currency,
        status,
        statusCode,
        statusUpdatedAt: txDate,
        transactionType: data.transactionType,
        transactionDate: txDate,
        source: data.source,
        notes: data.notes || null,
      },
    });
    await this.reversals.recordStatusEvent(
      workspaceId, institutionCode, ingestionChannel, data, statusCode, transaction.id, 'MATCHED'
    );
    await this.reversals.resolvePending(transaction);
    return { isDuplicate: false, transaction };
  }

  public async update(workspaceId: string, id: string, data: UpdateTransactionInput) {
    const requestedStatus = data.statusCode || (data.status ? normalizeTransactionStatus(data.status) : undefined);
    const current = await prisma.transaction.findFirst({ where: { id, workspaceId, ...visibleTransactionWhere() } });
    if (!current) return null;
    const categoryChanged = Boolean(data.category && data.category !== current.category);
    const merchantChanged = Boolean(data.merchant && data.merchant !== current.merchant);
    const result = await prisma.transaction.updateMany({
      where: { id, workspaceId, classificationVersion: current.classificationVersion, ...visibleTransactionWhere() },
      data: {
        ...(data.merchant && { merchant: data.merchant }),
        ...(data.category && { category: data.category }),
        ...(categoryChanged ? { categoryOrigin: 'MANUAL', categoryRuleId: null } : {}),
        ...(merchantChanged ? { merchantOrigin: 'MANUAL', merchantRuleId: null } : {}),
        classificationVersion: { increment: 1 },
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(requestedStatus && {
          statusCode: requestedStatus,
          status: transactionStatusLabel(requestedStatus),
          statusUpdatedAt: new Date(),
        }),
      },
    });
    if (!result.count) throw new AppError(409, 'TRANSACTION_VERSION_CONFLICT', 'El movimiento cambió. Actualiza e inténtalo nuevamente.');
    return prisma.transaction.findFirst({ where: { id, workspaceId } });
  }

  public async remove(workspaceId: string, id: string): Promise<number> {
    return (await prisma.transaction.deleteMany({ where: { id, workspaceId, ...visibleTransactionWhere() } })).count;
  }
}
