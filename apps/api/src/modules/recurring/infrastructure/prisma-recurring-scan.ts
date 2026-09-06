import { prisma } from '../../../config/database';
import { visibleTransactionWhere } from '../../transactions';
import type { RecurringCandidate } from '../application/recurring.ports';
import type { RecurringDetection } from '../domain/recurring-detection';
import { nextCadenceDate } from '../domain/recurring-detection';

const TWO_YEARS_MS = 740 * 86_400_000;

export class PrismaRecurringScan {
  async candidates(workspaceId: string): Promise<RecurringCandidate[]> {
    const rows = await prisma.transaction.findMany({
      where: {
        workspaceId, statusCode: 'APPROVED', ...visibleTransactionWhere(),
        transactionDate: { gte: new Date(Date.now() - TWO_YEARS_MS) },
      },
      select: { merchantKey: true, merchant: true, currency: true },
      distinct: ['merchantKey', 'merchant', 'currency'],
    });
    const unique = new Map<string, RecurringCandidate>();
    for (const row of rows) {
      const identityKey = (row.merchantKey || row.merchant).trim().toLocaleLowerCase('es');
      const key = `${identityKey}\u0000${row.currency}`;
      if (!unique.has(key)) unique.set(key, {
        identityKey, displayName: row.merchant, currency: row.currency, merchantKey: row.merchantKey,
      });
    }
    return [...unique.values()].sort((a, b) =>
      a.identityKey.localeCompare(b.identityKey) || a.currency.localeCompare(b.currency));
  }

  async observations(workspaceId: string, candidate: RecurringCandidate) {
    const rows = await prisma.transaction.findMany({
      where: {
        workspaceId, currency: candidate.currency, statusCode: 'APPROVED', ...visibleTransactionWhere(),
        ...(candidate.merchantKey
          ? { merchantKey: candidate.merchantKey }
          : { merchantKey: null, merchant: candidate.displayName }),
      },
      select: { id: true, amount: true, transactionDate: true },
      orderBy: { transactionDate: 'desc' }, take: 12,
    });
    return rows.map((row) => ({ id: row.id, amount: Number(row.amount), occurredAt: row.transactionDate }));
  }

  async saveDetection(workspaceId: string, candidate: RecurringCandidate, detection: RecurringDetection) {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.recurringBill.findUnique({
        where: { workspaceId_identityKey_currency: { workspaceId, identityKey: candidate.identityKey, currency: candidate.currency } },
      });
      const dismissedChanged = existing?.status === 'DISMISSED' && (
        existing.cadence !== detection.cadence ||
        Math.abs(Number(existing.dismissedAmount || existing.expectedAmount) - detection.expectedAmount) /
          Number(existing.dismissedAmount || existing.expectedAmount) > 0.1
      );
      const preserveUserValues = Boolean(existing?.userEditedAt) && !dismissedChanged;
      const newObservation = Boolean(existing && detection.lastSeenAt > existing.lastSeenAt);
      const bill = await tx.recurringBill.upsert({
        where: { workspaceId_identityKey_currency: { workspaceId, identityKey: candidate.identityKey, currency: candidate.currency } },
        create: {
          workspaceId, identityKey: candidate.identityKey, displayName: candidate.displayName,
          currency: candidate.currency, cadence: detection.cadence, expectedAmount: detection.expectedAmount,
          nextExpectedDate: detection.nextExpectedDate, lastSeenAt: detection.lastSeenAt,
          occurrenceCount: detection.occurrenceCount, confidence: detection.confidence,
        },
        update: {
          lastSeenAt: detection.lastSeenAt, occurrenceCount: detection.occurrenceCount, confidence: detection.confidence,
          ...(!preserveUserValues ? {
            displayName: candidate.displayName, cadence: detection.cadence,
            expectedAmount: detection.expectedAmount, nextExpectedDate: detection.nextExpectedDate,
          } : {}),
          ...(preserveUserValues && newObservation && existing
            ? { nextExpectedDate: nextCadenceDate(detection.lastSeenAt, existing.cadence) }
            : {}),
          ...(dismissedChanged ? { status: 'SUGGESTED', dismissedAmount: null, userEditedAt: null } : {}),
        },
      });
      await tx.recurringOccurrence.createMany({
        data: detection.observations.map((item) => ({
          recurringBillId: bill.id, transactionId: item.id, amount: item.amount, occurredAt: item.occurredAt,
        })),
        skipDuplicates: true,
      });
      if (detection.priceHike) await tx.recurringAlert.upsert({
        where: { recurringBillId_kind_sourceTransactionId: {
          recurringBillId: bill.id, kind: 'PRICE_HIKE', sourceTransactionId: detection.priceHike.transactionId,
        } },
        create: {
          recurringBillId: bill.id, kind: 'PRICE_HIKE', sourceTransactionId: detection.priceHike.transactionId,
          baselineAmount: detection.priceHike.baseline, observedAmount: detection.priceHike.observed,
        }, update: {},
      });
      if (bill.status === 'CONFIRMED' && detection.nextExpectedDate < new Date(Date.now() - 45 * 86_400_000)) {
        const source = `missed:${detection.nextExpectedDate.toISOString().slice(0, 10)}`;
        await tx.recurringAlert.upsert({
          where: { recurringBillId_kind_sourceTransactionId: {
            recurringBillId: bill.id, kind: 'MISSED_EXPECTED_CHARGE', sourceTransactionId: source,
          } },
          create: { recurringBillId: bill.id, kind: 'MISSED_EXPECTED_CHARGE', sourceTransactionId: source },
          update: {},
        });
      }
    });
  }
}
