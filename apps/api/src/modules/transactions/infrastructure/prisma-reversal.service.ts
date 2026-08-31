import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import { AppError } from '../../../errors/app-error';
import type { CreateTransactionInput } from '../../../schemas/transaction.schema';
import { transactionStatusLabel, type TransactionStatusCodeName } from '../../../domain/transaction-status';

type Channel = NonNullable<CreateTransactionInput['ingestionChannel']>;

export class PrismaReversalService {
  private statusEventData(
    workspaceId: string,
    institutionCode: string,
    ingestionChannel: Channel,
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

  public recordStatusEvent(
    workspaceId: string,
    institutionCode: string,
    ingestionChannel: Channel,
    data: CreateTransactionInput,
    statusCode: TransactionStatusCodeName,
    transactionId: string | null,
    resolution: 'MATCHED' | 'UNMATCHED' | 'AMBIGUOUS'
  ) {
    const values = this.statusEventData(workspaceId, institutionCode, ingestionChannel, data, statusCode);
    return prisma.transactionStatusEvent.upsert({
      where: { workspaceId_institutionCode_externalId: { workspaceId, institutionCode, externalId: data.externalId } },
      create: { ...values, transactionId, resolution },
      update: { ...values, transactionId, resolution },
    });
  }

  public async apply(
    workspaceId: string,
    institutionCode: string,
    ingestionChannel: Channel,
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
            transactionDate: { gte: new Date(eventDate.getTime() - 15 * 60 * 1000), lte: eventDate },
          },
          orderBy: { transactionDate: 'desc' },
          take: 3,
        });
    const compatible = candidates.filter((candidate) =>
      !data.transactionType || candidate.transactionType.toLowerCase() === data.transactionType.toLowerCase()
    );
    const candidate = compatible[0];
    const firstDistance = candidate ? eventDate.getTime() - candidate.transactionDate.getTime() : null;
    const secondDistance = compatible[1]
      ? eventDate.getTime() - compatible[1].transactionDate.getTime()
      : null;
    if (!candidate) {
      await this.recordStatusEvent(workspaceId, institutionCode, ingestionChannel, data, 'REVERSED', null, 'UNMATCHED');
      throw new AppError(409, 'REVERSAL_MATCH_NOT_FOUND', 'The reversal is waiting for its approved transaction.');
    }
    if (firstDistance !== null && secondDistance !== null && firstDistance === secondDistance) {
      await this.recordStatusEvent(workspaceId, institutionCode, ingestionChannel, data, 'REVERSED', null, 'AMBIGUOUS');
      throw new AppError(409, 'REVERSAL_MATCH_AMBIGUOUS', 'The reversal matches more than one transaction.');
    }
    const transaction = await prisma.transaction.update({
      where: { id: candidate.id },
      data: { statusCode: 'REVERSED', status: transactionStatusLabel('REVERSED'), statusUpdatedAt: eventDate },
    });
    await this.recordStatusEvent(
      workspaceId, institutionCode, ingestionChannel, data, 'REVERSED', transaction.id, 'MATCHED'
    );
    return transaction;
  }

  public async resolvePending(transaction: {
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
        where: { id: event.id }, data: { transactionId: transaction.id, resolution: 'MATCHED' },
      }),
      prisma.transaction.update({
        where: { id: transaction.id },
        data: { statusCode: 'REVERSED', status: transactionStatusLabel('REVERSED'), statusUpdatedAt: event.eventDate },
      }),
    ]);
    return event;
  }
}
