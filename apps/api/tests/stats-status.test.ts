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
});
