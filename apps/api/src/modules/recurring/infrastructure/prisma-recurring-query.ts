import type { RecurringAlert, RecurringBill } from '@prisma/client';
import type { RecurringBillDto, RecurringRadarDto, UpdateRecurringBillInput } from '@bills/contracts';
import { prisma } from '../../../config/database';
import { visibleTransactionWhere } from '../../transactions';
import { daysFrom, monthlyBurden, parseDateOnly, projectedDates, toDateOnly } from '../domain/recurring-projection';

type BillWithAlerts = RecurringBill & { alerts: RecurringAlert[] };
const round = (value: number) => Math.round(value * 100) / 100;

function santoDomingoToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santo_Domingo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

export function recurringDto(bill: BillWithAlerts, today = santoDomingoToday()): RecurringBillDto {
  return {
    id: bill.id, displayName: bill.displayName, currency: bill.currency as 'DOP' | 'USD',
    cadence: bill.cadence, expectedAmount: Number(bill.expectedAmount),
    nextExpectedDate: toDateOnly(bill.nextExpectedDate), lastSeenAt: bill.lastSeenAt.toISOString(),
    occurrenceCount: bill.occurrenceCount, confidence: bill.confidence,
    status: bill.status, userEdited: Boolean(bill.userEditedAt),
    daysRemaining: daysFrom(today, bill.nextExpectedDate),
    alerts: bill.alerts.map((alert) => ({
      id: alert.id, kind: alert.kind,
      baselineAmount: alert.baselineAmount === null ? null : Number(alert.baselineAmount),
      observedAmount: alert.observedAmount === null ? null : Number(alert.observedAmount),
      createdAt: alert.createdAt.toISOString(),
    })),
  };
}

export class PrismaRecurringQuery {
  async ensureScanScheduled(workspaceId: string) {
    await prisma.recurringScanJob.upsert({
      where: { workspaceId }, update: {}, create: { workspaceId },
    });
  }

  async radar(workspaceId: string, currency: 'DOP' | 'USD', window: number): Promise<RecurringRadarDto> {
    const today = santoDomingoToday();
    const [bills, job] = await Promise.all([
      prisma.recurringBill.findMany({
        where: { workspaceId, currency, status: { not: 'DISMISSED' } },
        include: { alerts: { where: { acknowledgedAt: null }, orderBy: { createdAt: 'desc' } } },
        orderBy: [{ nextExpectedDate: 'asc' }, { displayName: 'asc' }],
      }),
      prisma.recurringScanJob.findUnique({ where: { workspaceId } }),
    ]);
    const mapped = bills.map((bill) => recurringDto(bill, today));
    const confirmed = mapped.filter((bill) => bill.status === 'CONFIRMED');
    const dueWithin = (days: number) => confirmed.filter((bill) => bill.daysRemaining >= 0 && bill.daysRemaining <= days).length;
    return {
      currency, generatedAt: new Date().toISOString(), analysisStatus: job?.status || 'PENDING',
      fixedMonthlyBurden: round(confirmed.reduce(
        (sum, bill) => sum + monthlyBurden(bill.expectedAmount, bill.cadence), 0,
      )),
      upcoming: confirmed.filter((bill) => bill.daysRemaining >= 0 && bill.daysRemaining <= window),
      upcomingWindows: { in7: dueWithin(7), in14: dueWithin(14), in30: dueWithin(30) },
      suggestions: mapped.filter((bill) => bill.status === 'SUGGESTED'),
      attention: mapped.filter((bill) => bill.alerts.length > 0),
      paused: mapped.filter((bill) => bill.status === 'PAUSED'),
    };
  }

  async update(workspaceId: string, id: string, input: UpdateRecurringBillInput) {
    const existing = await prisma.recurringBill.findFirst({ where: { id, workspaceId } });
    if (!existing) return null;
    const updated = await prisma.recurringBill.update({
      where: { id },
      data: {
        ...input,
        ...(input.nextExpectedDate ? { nextExpectedDate: parseDateOnly(input.nextExpectedDate) } : {}),
        userEditedAt: new Date(),
        ...(input.status === 'DISMISSED' ? { dismissedAmount: input.expectedAmount ?? existing.expectedAmount } : {}),
      },
      include: { alerts: { where: { acknowledgedAt: null }, orderBy: { createdAt: 'desc' } } },
    });
    return recurringDto(updated);
  }

  async acknowledgeAlert(workspaceId: string, id: string) {
    const result = await prisma.recurringAlert.updateMany({
      where: { id, recurringBill: { workspaceId } }, data: { acknowledgedAt: new Date() },
    });
    return result.count > 0;
  }

  async sumFutureThroughMonthEnd(workspaceId: string, currency: string, today: string) {
    const [year, month] = today.slice(0, 7).split('-').map(Number);
    return this.sumFutureThrough(workspaceId, currency, today, toDateOnly(new Date(Date.UTC(year, month, 0))));
  }

  async sumFutureThrough(workspaceId: string, currency: string, after: string, through: string) {
    const start = parseDateOnly(after);
    const end = parseDateOnly(through);
    const bills = await prisma.recurringBill.findMany({ where: { workspaceId, currency, status: 'CONFIRMED' } });
    const totals = await Promise.all(bills.map(async (bill) => {
      const dates = projectedDates(bill.nextExpectedDate, bill.cadence, start, end);
      const includesToday = dates.some((date) => toDateOnly(date) === after);
      if (!includesToday) return dates.length * Number(bill.expectedAmount);
      const materialized = await prisma.transaction.findFirst({
        where: {
          workspaceId, currency, statusCode: 'APPROVED', ...visibleTransactionWhere(),
          transactionDate: {
            gte: new Date(`${after}T00:00:00.000-04:00`),
            lte: new Date(`${after}T23:59:59.999-04:00`),
          },
          OR: [
            { merchantKey: bill.identityKey },
            { merchant: { equals: bill.displayName, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      return (dates.length - (materialized ? 1 : 0)) * Number(bill.expectedAmount);
    }));
    return round(totals.reduce((sum, value) => sum + value, 0));
  }
}
