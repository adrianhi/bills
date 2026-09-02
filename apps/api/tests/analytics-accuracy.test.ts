import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from '../src/modules/analytics/application/analytics.service';
import type { AnalyticsTransaction } from '../src/modules/analytics/domain/summarize-transactions';

const transaction = (category: string, merchant: string, amount: number): AnalyticsTransaction => ({
  category, merchant, amount, currency: 'DOP', statusCode: 'APPROVED', transactionType: 'Compra',
  source: 'MANUAL', institutionCode: 'BHD', transactionDate: new Date('2026-07-10T12:00:00Z'),
});
afterEach(() => vi.useRealTimers());

async function compare(current: AnalyticsTransaction[], previous: AnalyticsTransaction[]) {
  let reads = 0;
  const service = new AnalyticsService({
    findTransactions: async () => reads++ === 0 ? current : previous,
    listCategories: async () => [],
  });
  return service.getSummary('workspace-a', { month: '2026-07', currency: 'DOP' });
}

describe('analytics accuracy regressions', () => {
  it('keeps stable spending neutral and identifies increases when total spending rises', async () => {
    const previous = ['A', 'B', 'C'].map((name) => transaction('General', name, 100));
    const stable = await compare(previous, previous);
    expect(stable.insights.map((item) => item.code)).toEqual(['SPENDING_STABLE']);
    const increased = await compare(previous.map((item) => ({ ...item, amount: 200 })), previous);
    expect(increased.insights.map((item) => item.code)).toEqual(['SPENDING_INCREASED', 'CATEGORY_INCREASE_DRIVER', 'MERCHANT_INCREASE_DRIVER']);
  });
  it('retains the neutral month-end projection with enough effective observations', async () => {
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-07-10T12:00:00Z'));
    const rows = Array.from({ length: 5 }, (_, i) => transaction('General', String(i), 100));
    const result = await compare(rows, rows);
    expect(result.insights.find((item) => item.code === 'MONTH_END_PACE')).toMatchObject({ tone: 'neutral', metric: { value: 1550 } });
  });
  it('identifies the reduction of 600 rather than the reduction of 10', async () => {
    const result = await compare(
      [transaction('Pequeña', 'A', 90), transaction('Grande', 'B', 400), transaction('Estable', 'C', 50)],
      [transaction('Pequeña', 'A', 100), transaction('Grande', 'B', 1000), transaction('Estable', 'C', 50)],
    );
    expect(result.insights.find((item) => item.code === 'CATEGORY_SAVING_DRIVER')).toMatchObject({
      title: 'Grande tuvo la mayor reducción', metric: { value: -600 },
    });
    expect(result.comparison?.categoryDeltas[0].changeAmount).toBe(-600);
  });

  it('compares merchants before limiting the rankings', async () => {
    const result = await compare(
      [...Array.from({ length: 10 }, (_, i) => transaction('General', `M${i}`, i + 1)), transaction('General', 'Bravo', 500)],
      [...Array.from({ length: 10 }, (_, i) => transaction('General', `M${i}`, 100 + i)), transaction('General', 'Bravo', 90)],
    );
    expect(result.comparison?.merchantDeltas.find((item) => item.name === 'Bravo')).toMatchObject({
      currentTotal: 500, previousTotal: 90, changeAmount: 410,
    });
    expect(result.topMerchants).toHaveLength(10);
    expect(result.byMerchant).toHaveLength(10);
    expect(result).not.toHaveProperty('allMerchants');
  });

  it('explains a net reduction even when another category increased', async () => {
    const result = await compare(
      [transaction('Reducción', 'A', 100), transaction('Aumento', 'B', 400), transaction('Estable', 'C', 50)],
      [transaction('Reducción', 'A', 1000), transaction('Aumento', 'B', 100), transaction('Estable', 'C', 50)],
    );
    expect(result.insights[1]).toMatchObject({ code: 'CATEGORY_SAVING_DRIVER', metric: { value: -900 } });
  });

  it('does not invent improvement or deterioration without a previous expense base', async () => {
    const result = await compare(
      [transaction('Nueva', 'A', 100), transaction('Nueva', 'B', 200), transaction('Nueva', 'C', 300)], [],
    );
    expect(result.comparison?.expenseChangePercent).toBeNull();
    expect(result.insights).toEqual([]);
  });

  it('keeps non-effective statuses and other currencies out of comparisons', async () => {
    const base = transaction('General', 'Bravo', 100);
    const result = await compare([
      base, { ...base, currency: 'USD', amount: 900 },
      { ...base, statusCode: 'PENDING', amount: 900 }, { ...base, statusCode: 'REVERSED', amount: 900 },
      { ...base, statusCode: 'DECLINED', amount: 900 },
    ], [transaction('General', 'Bravo', 50)]);
    expect(result.totalAmount).toBe(100);
    expect(result.comparison?.expenseChangeAmount).toBe(50);
    expect(result.comparison?.merchantDeltas[0]).toMatchObject({ currentTotal: 100, previousTotal: 50 });
  });
});
