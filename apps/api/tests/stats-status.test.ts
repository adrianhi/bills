import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { summarizeTransactions } from '../src/modules/analytics/domain/summarize-transactions';

function transaction(statusCode: 'PENDING' | 'APPROVED' | 'DECLINED' | 'REVERSED', amount: number) {
  return {
    amount: new Prisma.Decimal(amount),
    currency: 'DOP',
    category: 'Transporte',
    merchant: 'Comercio de prueba',
    status: statusCode,
    statusCode,
    transactionType: 'Compra',
    source: 'BHD_EMAIL',
    institutionCode: 'BHD',
    transactionDate: new Date('2026-08-26T12:00:00-04:00'),
  };
}

describe('financial status analytics', () => {
  it('counts every status but spends only approved transactions', () => {
    const summary = summarizeTransactions([
      transaction('APPROVED', 100),
      transaction('REVERSED', 100),
      transaction('DECLINED', 50),
      transaction('PENDING', 25),
    ], 'DOP');

    expect(summary.totalAmount).toBe(100);
    expect(summary.averageTicket).toBe(100);
    expect(summary.approvedCount).toBe(1);
    expect(summary.reversedCount).toBe(1);
    expect(summary.rejectedCount).toBe(1);
    expect(summary.pendingCount).toBe(1);
    expect(summary.byCategory).toHaveLength(1);
    expect(summary.dailyTrend[0].total).toBe(100);
  });

  it('keeps breakdown counts scoped to the requested currency', () => {
    const usd = { ...transaction('APPROVED', 75), currency: 'USD' };
    const summary = summarizeTransactions([transaction('APPROVED', 100), usd], 'DOP', 10);
    expect(summary.totalTransactions).toBe(1);
    expect(summary.approvedCount).toBe(1);
    expect(summary.byCategory[0].count).toBe(1);
    expect(summary.dailyAverage).toBe(10);
  });

  it('tracks income in totalIncome and netSavings while keeping expense categories unpolluted', () => {
    const income = {
      ...transaction('APPROVED', 1500), transactionType: 'Transferencia Recibida',
      category: 'Ingresos / Transferencias', source: 'POPULAR_TRANSFER_INCOME', institutionCode: 'POPULAR',
    };
    const summary = summarizeTransactions([transaction('APPROVED', 100), income], 'DOP');
    expect(summary).toMatchObject({
      totalAmount: 100, totalIncome: 1500, totalIncomeDOP: 1500, totalIncomeUSD: 0,
      netSavings: 1400,
      totalTransactions: 2, approvedCount: 2, approvedExpenseCount: 1,
    });
    expect(summary.byCategory.map((item) => item.category)).not.toContain('Ingresos / Transferencias');
  });
});
