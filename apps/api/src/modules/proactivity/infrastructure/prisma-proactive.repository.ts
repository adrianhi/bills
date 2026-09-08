import type { TransactionDto } from '@bills/contracts';
import { prisma } from '../../../config/database';
import type { ProactiveDismissalRepository, ProactiveTransactionReader } from '../application/proactive.ports';

export class PrismaProactiveRepository implements ProactiveDismissalRepository, ProactiveTransactionReader {
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

    return items.map((t) => ({
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
      institutionCode: t.institutionCode,
      ingestionChannel: t.ingestionChannel,
      transactionDate: t.transactionDate.toISOString(),
      createdAt: t.createdAt.toISOString(),
    }));
  }
}
