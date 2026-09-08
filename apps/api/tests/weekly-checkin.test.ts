import { describe, expect, it } from 'vitest';
import type { TransactionDto } from '@bills/contracts';
import { computeWeeklyCheckin, resolveWeekPeriod } from '../src/modules/proactivity/domain/weekly-checkin';

describe('Weekly Check-in Domain', () => {
  const createTx = (id: string, merchant: string, category: string, amount: number): TransactionDto => ({
    id,
    externalId: `ext-${id}`,
    cardLast4: '1234',
    cardType: 'VISA',
    rawMerchant: merchant.toUpperCase(),
    merchant,
    amount,
    currency: 'DOP',
    status: 'Aprobada',
    statusCode: 'APPROVED',
    transactionType: 'Compra',
    category,
    transactionDate: '2026-09-06T12:00:00Z',
    createdAt: '2026-09-06T12:00:00Z',
  });

  it('computes total spent, difference, and percentage change vs previous week', () => {
    const currentWeekTransactions = [
      createTx('1', 'Bravo', 'Supermercado', 3000),
      createTx('2', 'PedidosYa', 'Restaurantes & Delivery', 1000),
    ];
    const previousWeekTransactions = [
      createTx('3', 'Sirena', 'Supermercado', 5000),
    ];

    const result = computeWeeklyCheckin({
      currency: 'DOP',
      currentWeekTransactions,
      previousWeekTransactions,
      daysToNextPayday: 6,
      dailyAllowance: 1200,
      completedAt: null,
      weekKey: '2026-08-31_2026-09-06',
      startDate: '2026-08-31',
      endDate: '2026-09-06',
    });

    expect(result.totalSpentThisWeek).toBe(4000);
    expect(result.totalSpentPreviousWeek).toBe(5000);
    expect(result.netDifference).toBe(-1000);
    expect(result.changePercent).toBe(-20); // 20% reduction
    expect(result.status).toBe('OPEN');
    expect(result.daysToNextPayday).toBe(6);
  });

  it('identifies top category and merchant correctly', () => {
    const currentWeekTransactions = [
      createTx('1', 'Bravo Supermercado', 'Supermercado', 3500),
      createTx('2', 'Uber', 'Transporte', 500),
      createTx('3', 'PedidosYa', 'Restaurantes & Delivery', 1000),
    ];

    const result = computeWeeklyCheckin({
      currency: 'DOP',
      currentWeekTransactions,
      previousWeekTransactions: [],
      daysToNextPayday: 7,
      dailyAllowance: 1500,
      completedAt: null,
      weekKey: '2026-08-31_2026-09-06',
      startDate: '2026-08-31',
      endDate: '2026-09-06',
    });

    expect(result.topCategory).toEqual({
      name: 'Supermercado',
      amount: 3500,
      percentage: 70, // 3500 / 5000 = 70%
    });
    expect(result.topMerchant).toEqual({
      name: 'Bravo Supermercado',
      amount: 3500,
    });
  });

  it('marks status as COMPLETED when completedAt is present', () => {
    const result = computeWeeklyCheckin({
      currency: 'DOP',
      currentWeekTransactions: [],
      previousWeekTransactions: [],
      daysToNextPayday: 5,
      dailyAllowance: 1000,
      completedAt: '2026-09-07T10:00:00Z',
      weekKey: '2026-08-31_2026-09-06',
      startDate: '2026-08-31',
      endDate: '2026-09-06',
    });

    expect(result.status).toBe('COMPLETED');
    expect(result.completedAt).toBe('2026-09-07T10:00:00Z');
  });

  it('resolves week bounds and days to payday in Santo Domingo timezone', () => {
    // 2026-09-08 is Tuesday
    const date = new Date('2026-09-08T15:00:00Z');
    const period = resolveWeekPeriod(date);

    expect(period.startDateStr).toBeDefined();
    expect(period.endDateStr).toBeDefined();
    expect(period.weekKey).toContain('_');
    expect(period.daysToNextPayday).toBe(7); // 15 - 8 = 7
  });
});
