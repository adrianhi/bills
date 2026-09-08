import type { TransactionDto } from '@bills/contracts';
import { prisma } from '../../../config/database';
import type {
  ProactiveDismissalRepository,
  ProactiveTransactionReader,
  ProactiveWeeklyExpenseReader,
  ProactiveWeeklyReviewRepository,
} from '../application/proactive.ports';

function mapTransaction(t: {
  id: string;
  externalId: string;
  cardLast4: string | null;
  cardType: string | null;
  rawMerchant: string;
  merchant: string;
  amount: unknown;
  currency: string;
  status: string;
  statusCode: string;
  transactionType: string;
  category: string;
  notes: string | null;
  source: string;
  institutionCode: string | null;
  ingestionChannel: string;
  transactionDate: Date;
  createdAt: Date;
}): TransactionDto {
  return {
    id: t.id,
    externalId: t.externalId,
    cardLast4: t.cardLast4,
    cardType: t.cardType,
    rawMerchant: t.rawMerchant,
    merchant: t.merchant,
    amount: Number(t.amount),
    currency: t.currency,
    status: t.status,
    statusCode: t.statusCode as TransactionDto['statusCode'],
    transactionType: t.transactionType,
    category: t.category,
    notes: t.notes,
    source: t.source,
    institutionCode: t.institutionCode || undefined,
    ingestionChannel: t.ingestionChannel,
    transactionDate: t.transactionDate.toISOString(),
    createdAt: t.createdAt.toISOString(),
  };
}

export class PrismaProactiveRepository
  implements
    ProactiveDismissalRepository,
    ProactiveTransactionReader,
    ProactiveWeeklyReviewRepository,
    ProactiveWeeklyExpenseReader
{
  async listDismissed(workspaceId: string, profileId: string, since: Date): Promise<string[]> {
    const events = await prisma.productEvent.findMany({
      where: {
        workspaceId,
        profileId,
        name: 'PROACTIVE_ACTION_DISMISSED',
        occurredAt: { gte: since },
      },
      select: { contextKey: true },
    });
    return events.map((e) => e.contextKey);
  }

  async dismiss(workspaceId: string, profileId: string, actionId: string): Promise<void> {
    await prisma.productEvent.upsert({
      where: {
        workspaceId_profileId_name_contextKey: {
          workspaceId,
          profileId,
          name: 'PROACTIVE_ACTION_DISMISSED',
          contextKey: actionId,
        },
      },
      create: {
        workspaceId,
        profileId,
        name: 'PROACTIVE_ACTION_DISMISSED',
        contextKey: actionId,
      },
      update: {
        occurredAt: new Date(),
      },
    });
  }

  async findUnclassified(
    workspaceId: string,
    currency: string,
    limit: number,
    since: Date
  ): Promise<TransactionDto[]> {
    const items = await prisma.transaction.findMany({
      where: {
        workspaceId,
        currency,
        statusCode: 'APPROVED',
        transactionDate: { gte: since },
        OR: [
          { category: 'Otros' },
          { category: '' },
          { category: 'Uncategorized' },
        ],
      },
      orderBy: { transactionDate: 'desc' },
      take: limit,
    });

    return items.map(mapTransaction);
  }

  async completedAt(workspaceId: string, profileId: string, weekKey: string): Promise<Date | null> {
    const event = await prisma.productEvent.findUnique({
      where: {
        workspaceId_profileId_name_contextKey: {
          workspaceId,
          profileId,
          name: 'WEEKLY_CHECKIN_COMPLETED',
          contextKey: weekKey,
        },
      },
      select: { occurredAt: true },
    });
    return event?.occurredAt || null;
  }

  async complete(workspaceId: string, profileId: string, weekKey: string): Promise<void> {
    await prisma.productEvent.upsert({
      where: {
        workspaceId_profileId_name_contextKey: {
          workspaceId,
          profileId,
          name: 'WEEKLY_CHECKIN_COMPLETED',
          contextKey: weekKey,
        },
      },
      create: {
        workspaceId,
        profileId,
        name: 'WEEKLY_CHECKIN_COMPLETED',
        contextKey: weekKey,
      },
      update: {
        occurredAt: new Date(),
      },
    });
  }

  async listBetween(
    workspaceId: string,
    currency: string,
    from: Date,
    to: Date
  ): Promise<TransactionDto[]> {
    const items = await prisma.transaction.findMany({
      where: {
        workspaceId,
        currency,
        statusCode: 'APPROVED',
        transactionDate: { gte: from, lte: to },
      },
      orderBy: { transactionDate: 'desc' },
    });
    return items.map(mapTransaction);
  }
}
