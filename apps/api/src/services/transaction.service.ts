import { prisma } from '../config/database';
import { CategorizationService } from './categorization.service';
import {
  CreateTransactionInput,
  TransactionQueryInput,
  UpdateTransactionInput,
  ExportQueryInput,
} from '../schemas/transaction.schema';
import { Prisma } from '@prisma/client';
import { AppError } from '../errors/app-error';
import {
  normalizeTransactionStatus,
  transactionStatusLabel,
  type TransactionStatusCodeName,
} from '../domain/transaction-status';

export class TransactionService {
  private static statusEventData(
    workspaceId: string,
    institutionCode: string,
    ingestionChannel: NonNullable<CreateTransactionInput['ingestionChannel']>,
    data: CreateTransactionInput,
    statusCode: TransactionStatusCodeName
  ) {
    return {
      workspaceId,
      institutionCode,
      externalId: data.externalId,
      statusCode,
      eventDate: new Date(data.transactionDate),
      amount: data.amount,
      currency: data.currency,
      cardLast4: data.cardLast4 || null,
      rawMerchant: data.rawMerchant || null,
      bankReference: data.bankReference || null,
      source: data.source,
      ingestionChannel,
    };
  }

  private static async recordStatusEvent(
    workspaceId: string,
    institutionCode: string,
    ingestionChannel: NonNullable<CreateTransactionInput['ingestionChannel']>,
    data: CreateTransactionInput,
    statusCode: TransactionStatusCodeName,
    transactionId: string | null,
    resolution: 'MATCHED' | 'UNMATCHED' | 'AMBIGUOUS'
  ) {
    const values = this.statusEventData(workspaceId, institutionCode, ingestionChannel, data, statusCode);
    return prisma.transactionStatusEvent.upsert({
      where: {
        workspaceId_institutionCode_externalId: {
          workspaceId,
          institutionCode,
          externalId: data.externalId,
        },
      },
      create: { ...values, transactionId, resolution },
      update: { ...values, transactionId, resolution },
    });
  }

  private static async applyReversal(
    workspaceId: string,
    institutionCode: string,
    ingestionChannel: NonNullable<CreateTransactionInput['ingestionChannel']>,
    data: CreateTransactionInput
  ) {
    const eventDate = new Date(data.transactionDate);
    let referenceTransactionId: string | null = null;

    if (data.bankReference) {
      const referenced = await prisma.transactionStatusEvent.findFirst({
        where: {
          workspaceId,
          institutionCode,
          bankReference: data.bankReference,
          transactionId: { not: null },
          statusCode: { in: ['APPROVED', 'REVERSED'] },
        },
        orderBy: { eventDate: 'desc' },
      });
      referenceTransactionId = referenced?.transactionId || null;
    }

    const candidates = referenceTransactionId
      ? await prisma.transaction.findMany({ where: { id: referenceTransactionId, workspaceId }, take: 1 })
      : await prisma.transaction.findMany({
          where: {
            workspaceId,
            institutionCode,
            amount: data.amount,
            currency: data.currency,
            statusCode: { in: ['APPROVED', 'REVERSED'] },
            ...(data.cardLast4 ? { cardLast4: data.cardLast4 } : {}),
            transactionDate: {
              gte: new Date(eventDate.getTime() - 15 * 60 * 1000),
              lte: eventDate,
            },
          },
          orderBy: { transactionDate: 'desc' },
          take: 3,
        });

    const compatible = candidates.filter((candidate) => {
      if (!data.transactionType) return true;
      return candidate.transactionType.toLowerCase() === data.transactionType.toLowerCase();
    });
    const candidate = compatible[0];
    const firstDistance = candidate ? eventDate.getTime() - candidate.transactionDate.getTime() : null;
    const secondDistance = compatible[1]
      ? eventDate.getTime() - compatible[1].transactionDate.getTime()
      : null;

    if (!candidate) {
      await this.recordStatusEvent(
        workspaceId,
        institutionCode,
        ingestionChannel,
        data,
        'REVERSED',
        null,
        'UNMATCHED'
      );
      throw new AppError(409, 'REVERSAL_MATCH_NOT_FOUND', 'The reversal is waiting for its approved transaction.');
    }

    if (firstDistance !== null && secondDistance !== null && firstDistance === secondDistance) {
      await this.recordStatusEvent(
        workspaceId,
        institutionCode,
        ingestionChannel,
        data,
        'REVERSED',
        null,
        'AMBIGUOUS'
      );
      throw new AppError(409, 'REVERSAL_MATCH_AMBIGUOUS', 'The reversal matches more than one transaction.');
    }

    const transaction = await prisma.transaction.update({
      where: { id: candidate.id },
      data: {
        statusCode: 'REVERSED',
        status: transactionStatusLabel('REVERSED'),
        statusUpdatedAt: eventDate,
      },
    });
    await this.recordStatusEvent(
      workspaceId,
      institutionCode,
      ingestionChannel,
      data,
      'REVERSED',
      transaction.id,
      'MATCHED'
    );
    return transaction;
  }

  private static async resolvePendingReversal(transaction: {
    id: string;
    workspaceId: string | null;
    institutionCode: string;
    amount: Prisma.Decimal;
    currency: string;
    cardLast4: string | null;
    transactionDate: Date;
  }) {
    if (!transaction.workspaceId) return null;
    const pending = await prisma.transactionStatusEvent.findMany({
      where: {
        workspaceId: transaction.workspaceId,
        institutionCode: transaction.institutionCode,
        transactionId: null,
        resolution: 'UNMATCHED',
        statusCode: 'REVERSED',
        amount: transaction.amount,
        currency: transaction.currency,
        ...(transaction.cardLast4 ? { cardLast4: transaction.cardLast4 } : {}),
        eventDate: {
          gte: transaction.transactionDate,
          lte: new Date(transaction.transactionDate.getTime() + 15 * 60 * 1000),
        },
      },
      orderBy: { eventDate: 'asc' },
      take: 2,
    });
    if (pending.length !== 1) {
      if (pending.length > 1) {
        await prisma.transactionStatusEvent.updateMany({
          where: { id: { in: pending.map((event) => event.id) } },
          data: { resolution: 'AMBIGUOUS' },
        });
      }
      return null;
    }
    const event = pending[0];
    await prisma.$transaction([
      prisma.transactionStatusEvent.update({
        where: { id: event.id },
        data: { transactionId: transaction.id, resolution: 'MATCHED' },
      }),
      prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          statusCode: 'REVERSED',
          status: transactionStatusLabel('REVERSED'),
          statusUpdatedAt: event.eventDate,
        },
      }),
    ]);
    return event;
  }

  /**
   * Ingests a single transaction idempotently.
   * If externalId exists, returns existing record with isDuplicate = true.
   */
  public static async createTransaction(workspaceId: string, data: CreateTransactionInput) {
    const txDate = new Date(data.transactionDate);
    const institutionCode = this.resolveInstitutionCode(data.institutionCode, data.source);
    const ingestionChannel =
      data.ingestionChannel || (data.source === 'MANUAL' ? 'MANUAL' : 'EMAIL_FORWARD');
    const statusCode = data.statusCode || normalizeTransactionStatus(data.status);
    const status = transactionStatusLabel(statusCode);

    if (statusCode === 'REVERSED') {
      const transaction = await this.applyReversal(workspaceId, institutionCode, ingestionChannel, data);
      return { isDuplicate: true, transaction, statusUpdated: true };
    }

    // 1. Exact match by externalId (Idempotency)
    const existingByExtId = await prisma.transaction.findUnique({
      where: {
        workspaceId_institutionCode_externalId: {
          workspaceId,
          institutionCode,
          externalId: data.externalId,
        },
      },
    });

    if (existingByExtId) {
      const effectiveStatus = existingByExtId.statusCode === 'REVERSED' && statusCode === 'APPROVED'
        ? 'REVERSED'
        : statusCode;
      const updated = await prisma.transaction.update({
        where: { id: existingByExtId.id },
        data: {
          transactionDate: txDate,
          amount: data.amount,
          currency: data.currency,
          merchant: data.merchant || existingByExtId.merchant,
          category: data.category || existingByExtId.category,
          cardLast4: data.cardLast4 || existingByExtId.cardLast4,
          cardType: data.cardType || existingByExtId.cardType,
          transactionType: data.transactionType || existingByExtId.transactionType,
          notes: data.notes !== undefined ? data.notes : existingByExtId.notes,
          statusCode: effectiveStatus,
          status: transactionStatusLabel(effectiveStatus),
          statusUpdatedAt: effectiveStatus !== existingByExtId.statusCode ? txDate : existingByExtId.statusUpdatedAt,
        },
      });
      await this.recordStatusEvent(
        workspaceId, institutionCode, ingestionChannel, data, statusCode, updated.id, 'MATCHED'
      );
      return {
        isDuplicate: true,
        transaction: updated,
      };
    }

    // 2. Temporal & Financial Fuzzy Deduplication (Window of ±10 minutes)
    // Prevents duplicate records when bank sends both a debit table alert AND a transfer confirmation receipt.
    const windowStart = new Date(txDate.getTime() - 10 * 60 * 1000);
    const windowEnd = new Date(txDate.getTime() + 10 * 60 * 1000);

    const candidates = await prisma.transaction.findMany({
      where: {
        workspaceId,
        institutionCode,
        amount: data.amount,
        currency: data.currency,
        transactionDate: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
    });

    for (const cand of candidates) {
      const isSameCardOrAccount = !data.cardLast4 || !cand.cardLast4 || data.cardLast4 === cand.cardLast4;
      const isBothTransfers =
        (/transferencia|recibida|enviada/i.test(cand.transactionType || '') || /transferencia|recibida|enviada/i.test(cand.category || '')) &&
        (/transferencia|recibida|enviada/i.test(data.transactionType || '') || /transferencia|recibida|enviada/i.test(data.category || ''));

      // Only transfer notification pairs are eligible for fuzzy merging. Two card purchases at
      // the same merchant, card and amount can be legitimate and must remain separate.
      if (isSameCardOrAccount && isBothTransfers) {
        // Choose the longer / more complete merchant name (e.g. "Yeisaly Collado Rosario" over truncated "Yeisaly Collado Rosari")
        const betterMerchant =
          (data.merchant && data.merchant.length > (cand.merchant?.length || 0))
            ? data.merchant
            : (data.rawMerchant && data.rawMerchant.length > (cand.rawMerchant?.length || 0))
            ? data.rawMerchant
            : cand.merchant;

        const updated = await prisma.transaction.update({
          where: { id: cand.id },
          data: {
            merchant: betterMerchant,
            rawMerchant: data.rawMerchant.length > cand.rawMerchant.length ? data.rawMerchant : cand.rawMerchant,
            notes: data.notes || cand.notes,
            cardLast4: data.cardLast4 || cand.cardLast4,
            transactionType: data.transactionType || cand.transactionType,
            statusCode: cand.statusCode === 'REVERSED' && statusCode === 'APPROVED' ? 'REVERSED' : statusCode,
            status: cand.statusCode === 'REVERSED' && statusCode === 'APPROVED'
              ? transactionStatusLabel('REVERSED')
              : status,
          },
        });

        await this.recordStatusEvent(
          workspaceId, institutionCode, ingestionChannel, data, statusCode, updated.id, 'MATCHED'
        );

        return {
          isDuplicate: true,
          transaction: updated,
        };
      }
    }

    // 3. Normalize merchant and categorize
    const { merchant, category } = await CategorizationService.categorize(
      data.rawMerchant,
      data.merchant,
      data.category,
      workspaceId
    );

    // 4. Save new transaction to database
    const transaction = await prisma.transaction.create({
      data: {
        workspaceId,
        institutionCode,
        ingestionChannel,
        externalId: data.externalId,
        cardLast4: data.cardLast4 || null,
        cardType: data.cardType || null,
        rawMerchant: data.rawMerchant,
        merchant: merchant,
        category: category,
        amount: data.amount,
        currency: data.currency,
        status,
        statusCode,
        statusUpdatedAt: txDate,
        transactionType: data.transactionType,
        transactionDate: new Date(data.transactionDate),
        source: data.source,
        notes: data.notes || null,
      },
    });

    await this.recordStatusEvent(
      workspaceId, institutionCode, ingestionChannel, data, statusCode, transaction.id, 'MATCHED'
    );
    await this.resolvePendingReversal(transaction);

    return {
      isDuplicate: false,
      transaction,
    };
  }

  /**
   * Helper to identify organization code from source / merchant.
   */
  public static getOrganization(institutionCode?: string | null): string {
    const names: Record<string, string> = {
      BHD: 'Banco BHD',
      POPULAR: 'Banco Popular',
      BANRESERVAS: 'Banreservas',
      QIK: 'Qik Banco Digital',
      APAP: 'APAP',
      SCOTIABANK: 'Scotiabank',
      PROMERICA: 'Banco Promerica',
      CASH: 'Manual / Efectivo',
    };
    return names[(institutionCode || 'BHD').toUpperCase()] || institutionCode || 'Otra entidad';
  }

  public static resolveInstitutionCode(explicit?: string, source?: string): string {
    if (explicit) return explicit.toUpperCase();
    const value = (source || '').toUpperCase();
    if (value.includes('POPULAR') || value.includes('BPD')) return 'POPULAR';
    if (value.includes('BANRESERVAS') || value.includes('RESERVAS')) return 'BANRESERVAS';
    if (value.includes('QIK')) return 'QIK';
    if (value.includes('APAP')) return 'APAP';
    if (value.includes('SCOTIA')) return 'SCOTIABANK';
    if (value === 'MANUAL' || value.includes('CASH')) return 'CASH';
    return 'BHD';
  }

  /**
   * Batch ingests multiple transactions idempotently in parallel.
   */
  public static async batchCreateTransactions(workspaceId: string, items: CreateTransactionInput[]) {
    const results = await Promise.all(
      items.map(async (item) => {
        return this.createTransaction(workspaceId, item);
      })
    );

    let createdCount = 0;
    let duplicateCount = 0;

    for (const res of results) {
      if (res.isDuplicate) {
        duplicateCount++;
      } else {
        createdCount++;
      }
    }

    return {
      total: items.length,
      createdCount,
      duplicateCount,
      items: results,
    };
  }

  /**
   * Builds Prisma where clause from query parameters.
   */
  private static buildWhereClause(
    workspaceId: string,
    query: TransactionQueryInput | ExportQueryInput
  ): Prisma.TransactionWhereInput {
    const where: Prisma.TransactionWhereInput = { workspaceId };

    // Date filtering (startDate / endDate take precedence over month)
    if (query.startDate || query.endDate) {
      where.transactionDate = {};
      if (query.startDate) {
        const s = query.startDate.length === 10 ? new Date(`${query.startDate}T00:00:00.000Z`) : new Date(query.startDate);
        where.transactionDate.gte = s;
      }
      if (query.endDate) {
        const e = query.endDate.length === 10 ? new Date(`${query.endDate}T23:59:59.999Z`) : new Date(query.endDate);
        where.transactionDate.lte = e;
      }
    } else if (query.month) {
      const [yearStr, monthStr] = query.month.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

      where.transactionDate = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    }

    if (query.category) {
      where.category = {
        equals: query.category,
      };
    }

    if (query.currency) {
      where.currency = query.currency.toUpperCase();
    }

    if ('cardLast4' in query && query.cardLast4) {
      where.cardLast4 = query.cardLast4;
    }

    if (query.status) {
      where.statusCode = normalizeTransactionStatus(query.status);
    }

    // Organization / Source filter
    const orgFilter = query.institutionCode || query.organization || query.source;
    if (orgFilter && orgFilter.toUpperCase() !== 'ALL') {
      const orgUpper = orgFilter.toUpperCase();
      if (orgUpper === 'BHD' || orgUpper === 'BANCO BHD') {
        where.institutionCode = 'BHD';
      } else if (orgUpper === 'POPULAR' || orgUpper === 'BANCO POPULAR') {
        where.institutionCode = 'POPULAR';
      } else if (orgUpper === 'BANRESERVAS') {
        where.institutionCode = 'BANRESERVAS';
      } else if (orgUpper === 'QIK') {
        where.institutionCode = 'QIK';
      } else {
        where.institutionCode = orgUpper;
      }
    }

    // Transaction Type filter
    if (query.transactionType) {
      const typeLower = query.transactionType.toLowerCase();
      if (typeLower === 'recibida' || typeLower.includes('recibida') || typeLower === 'ingreso') {
        where.OR = [
          { transactionType: { contains: 'Recibida' } },
          { category: { contains: 'Ingresos' } },
          { source: 'BHD_TRANSFER_INCOME' },
        ];
      } else if (typeLower === 'enviada' || typeLower.includes('enviada')) {
        where.AND = [
          { transactionType: { contains: 'Transferencia' } },
          { NOT: { transactionType: { contains: 'Recibida' } } },
          { NOT: { source: 'BHD_TRANSFER_INCOME' } },
        ];
      } else if (typeLower === 'compra') {
        where.transactionType = { contains: 'Compra' };
      } else if (typeLower === 'servicio') {
        where.OR = [
          { transactionType: { contains: 'Servicio' } },
          { category: 'Servicios' },
          { source: 'BHD_SERVICE_PAYMENT' },
        ];
      } else if (typeLower === 'retiro') {
        where.transactionType = { contains: 'Retiro' };
      } else {
        where.transactionType = query.transactionType;
      }
    }

    if (query.search) {
      const searchOR = [
        { merchant: { contains: query.search } },
        { rawMerchant: { contains: query.search } },
        { notes: { contains: query.search } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchOR }];
        delete where.OR;
      } else {
        where.OR = searchOR;
      }
    }

    return where;
  }

  /**
   * Retrieves paginated transactions with summary statistics.
   */
  public static async getTransactions(workspaceId: string, query: TransactionQueryInput) {
    const where = this.buildWhereClause(workspaceId, query);
    const skip = (query.page - 1) * query.limit;

    const [total, transactions, allMatching] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: {
          [query.sortBy]: query.sortOrder,
        },
      }),
      // Fetch amounts, currencies, and categories for summary calculations
      prisma.transaction.findMany({
        where,
        select: {
          amount: true,
          currency: true,
          category: true,
          statusCode: true,
          transactionType: true,
          source: true,
        },
      }),
    ]);

    // Calculate aggregations
    let totalDOP = 0;
    let totalUSD = 0;
    const categoryTotals: Record<string, { dop: number; usd: number; count: number }> = {};

    for (const item of allMatching) {
      const isIncome =
        /recibida/i.test(item.transactionType || '') ||
        /ingreso/i.test(item.category || '') ||
        item.source === 'BHD_TRANSFER_INCOME';
      if (item.statusCode !== 'APPROVED' || isIncome) continue;
      if (item.currency === 'USD') {
        totalUSD += Number(item.amount);
      } else {
        totalDOP += Number(item.amount);
      }

      if (!categoryTotals[item.category]) {
        categoryTotals[item.category] = { dop: 0, usd: 0, count: 0 };
      }
      if (item.currency === 'USD') {
        categoryTotals[item.category].usd += Number(item.amount);
      } else {
        categoryTotals[item.category].dop += Number(item.amount);
      }
      categoryTotals[item.category].count++;
    }

    return {
      data: transactions,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalItems: total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
      summary: {
        totalTransactions: total,
        totalDOP: Math.round(totalDOP * 100) / 100,
        totalUSD: Math.round(totalUSD * 100) / 100,
        byCategory: categoryTotals,
      },
    };
  }

  /**
   * Retrieves all matching transactions for export (no pagination limit).
   */
  public static async getTransactionsForExport(workspaceId: string, query: ExportQueryInput) {
    const where = this.buildWhereClause(workspaceId, query);
    return prisma.transaction.findMany({
      where,
      orderBy: { transactionDate: 'desc' },
    });
  }

  /**
   * Retrieves a single transaction by ID.
   */
  public static async getTransactionById(workspaceId: string, id: string) {
    return prisma.transaction.findFirst({
      where: { id, workspaceId },
    });
  }

  /**
   * Updates a transaction (e.g., manual recategorization, merchant rename, or notes).
   */
  public static async updateTransaction(workspaceId: string, id: string, data: UpdateTransactionInput) {
    const requestedStatus = data.statusCode || (data.status ? normalizeTransactionStatus(data.status) : undefined);
    const result = await prisma.transaction.updateMany({
      where: { id, workspaceId },
      data: {
        ...(data.merchant && { merchant: data.merchant }),
        ...(data.category && { category: data.category }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(requestedStatus && {
          statusCode: requestedStatus,
          status: transactionStatusLabel(requestedStatus),
          statusUpdatedAt: new Date(),
        }),
      },
    });
    if (result.count === 0) return null;
    return this.getTransactionById(workspaceId, id);
  }

  /**
   * Deletes a transaction by ID.
   */
  public static async deleteTransaction(workspaceId: string, id: string) {
    return prisma.transaction.deleteMany({ where: { id, workspaceId } });
  }
}
