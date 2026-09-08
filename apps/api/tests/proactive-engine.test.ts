import { describe, expect, it } from 'vitest';
import type { BudgetSummaryDto, RecurringBillDto, SafeToSpendDto, TransactionDto } from '@bills/contracts';
import { evaluateProactiveFeed } from '../src/modules/proactivity/domain/proactive-rules';

describe('evaluateProactiveFeed', () => {
  const baseInput = {
    currency: 'DOP' as const,
    today: '2026-09-08',
    month: '2026-09',
    monthDaysRemaining: 22,
    recurringBills: [] as RecurringBillDto[],
    recurringAttention: [] as RecurringBillDto[],
    budgetSummary: null as BudgetSummaryDto | null,
    safeToSpend: null as SafeToSpendDto | null,
    unclassifiedTransactions: [] as TransactionDto[],
    dismissedActionIds: new Set<string>(),
  };

  it('generates IMMINENT_BILL action when bill is due in <= 3 days and unpaid', () => {
    const bill: RecurringBillDto = {
      id: 'bill-claro-1',
      displayName: 'Claro Internet',
      currency: 'DOP',
      cadence: 'MONTHLY',
      expectedAmount: 2199,
      nextExpectedDate: '2026-09-10',
      lastSeenAt: '2026-08-10',
      occurrenceCount: 5,
      confidence: 0.95,
      status: 'CONFIRMED',
      userEdited: false,
      daysRemaining: 2,
      monthStatus: 'UPCOMING',
      alerts: [],
    };

    const result = evaluateProactiveFeed({
      ...baseInput,
      recurringBills: [bill],
    });

    expect(result.counts.imminentBills).toBe(1);
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].kind).toBe('IMMINENT_BILL');
    expect(result.actions[0].priority).toBe('HIGH');
    expect(result.actions[0].title).toContain('Claro Internet');
    expect(result.actions[0].description).toContain('en 2 días');
    expect(result.actions[0].actionType).toBe('NAVIGATE_RECURRING');
  });

  it('ignores imminent bill if already paid this month', () => {
    const bill: RecurringBillDto = {
      id: 'bill-claro-2',
      displayName: 'Claro Internet',
      currency: 'DOP',
      cadence: 'MONTHLY',
      expectedAmount: 2199,
      nextExpectedDate: '2026-09-10',
      lastSeenAt: '2026-09-02',
      occurrenceCount: 5,
      confidence: 0.95,
      status: 'CONFIRMED',
      userEdited: false,
      daysRemaining: 2,
      monthStatus: 'PAID',
      alerts: [],
    };

    const result = evaluateProactiveFeed({
      ...baseInput,
      recurringBills: [bill],
    });

    expect(result.counts.imminentBills).toBe(0);
    expect(result.actions).toHaveLength(0);
  });

  it('generates BUDGET_PACING_RISK when category is burning too fast', () => {
    const budgetSummary: BudgetSummaryDto = {
      month: '2026-09',
      currency: 'DOP',
      hasBudget: true,
      propagation: 'CURRENT_AND_FUTURE',
      totalSpent: 18000,
      totalPending: 0,
      unbudgetedSpent: 0,
      global: null,
      categories: [
        {
          scope: 'CATEGORY',
          categoryKey: 'supermercado',
          categoryLabel: 'Supermercado',
          limit: 10000,
          spent: 8500,
          pending: 0,
          remaining: 1500,
          exceededBy: 0,
          percentUsed: 85,
          projected: 16000,
          status: 'PACE_WARNING',
        },
      ],
      alerts: [],
    };

    const result = evaluateProactiveFeed({
      ...baseInput,
      budgetSummary,
    });

    expect(result.counts.pacingRisks).toBe(1);
    expect(result.actions).toHaveLength(1);
    const action = result.actions[0];
    expect(action.kind).toBe('BUDGET_PACING_RISK');
    expect(action.title).toContain('Supermercado');
    expect(action.description).toContain('85%');
    expect(action.actionType).toBe('NAVIGATE_BUDGET');
  });

  it('generates UNCLASSIFIED_EXPENSES when transactions are in Otros', () => {
    const sampleTx: TransactionDto = {
      id: 'tx-1',
      externalId: 'ext-1',
      cardLast4: '1234',
      cardType: 'VISA',
      rawMerchant: 'PEDIDOSYA',
      merchant: 'PedidosYa',
      amount: 450,
      currency: 'DOP',
      status: 'Aprobada',
      statusCode: 'APPROVED',
      transactionType: 'Compra',
      category: 'Otros',
      transactionDate: '2026-09-07T10:00:00Z',
      createdAt: '2026-09-07T10:00:00Z',
    };

    const result = evaluateProactiveFeed({
      ...baseInput,
      unclassifiedTransactions: [sampleTx],
    });

    expect(result.counts.unclassified).toBe(1);
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].kind).toBe('UNCLASSIFIED_EXPENSES');
    expect(result.actions[0].ctaLabel).toBe('Clasificar ahora');
  });

  it('generates PRICE_HIKE alert for recurring attention item', () => {
    const bill: RecurringBillDto = {
      id: 'bill-netflix',
      displayName: 'Netflix',
      currency: 'USD',
      cadence: 'MONTHLY',
      expectedAmount: 12.99,
      nextExpectedDate: '2026-09-20',
      lastSeenAt: '2026-08-20',
      occurrenceCount: 6,
      confidence: 0.99,
      status: 'CONFIRMED',
      userEdited: false,
      daysRemaining: 12,
      monthStatus: 'UPCOMING',
      alerts: [
        {
          id: 'alert-hike-1',
          kind: 'PRICE_HIKE',
          baselineAmount: 10.99,
          observedAmount: 13.99,
          createdAt: '2026-09-01T00:00:00Z',
        },
      ],
    };

    const result = evaluateProactiveFeed({
      ...baseInput,
      currency: 'USD',
      recurringAttention: [bill],
    });

    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].kind).toBe('PRICE_HIKE');
    expect(result.actions[0].title).toContain('Netflix');
  });

  it('generates SAVING_STREAK when in surplus and no pacing risks', () => {
    const safeToSpend: SafeToSpendDto = {
      date: '2026-09-08',
      month: '2026-09',
      currency: 'DOP',
      status: 'SURPLUS',
      reason: 'NONE',
      globalLimit: 50000,
      spentBeforeToday: 5000,
      spentToday: 300,
      futureConfirmedCommitments: 10000,
      daysRemaining: 22,
      dailyAllowance: 1577,
      todayAvailable: 1277,
      todayOverage: 0,
      nextDailyAllowance: 1577,
    };

    const result = evaluateProactiveFeed({
      ...baseInput,
      safeToSpend,
    });

    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].kind).toBe('SAVING_STREAK');
    expect(result.actions[0].priority).toBe('LOW');
  });

  it('excludes dismissed actions', () => {
    const bill: RecurringBillDto = {
      id: 'bill-claro-1',
      displayName: 'Claro Internet',
      currency: 'DOP',
      cadence: 'MONTHLY',
      expectedAmount: 2199,
      nextExpectedDate: '2026-09-10',
      lastSeenAt: '2026-08-10',
      occurrenceCount: 5,
      confidence: 0.95,
      status: 'CONFIRMED',
      userEdited: false,
      daysRemaining: 2,
      monthStatus: 'UPCOMING',
      alerts: [],
    };

    const dismissedId = `imminent-bill-${bill.id}-${baseInput.today}`;
    const result = evaluateProactiveFeed({
      ...baseInput,
      recurringBills: [bill],
      dismissedActionIds: new Set([dismissedId]),
    });

    expect(result.actions).toHaveLength(0);
    // Count still tracks the underlying occurrence
    expect(result.counts.imminentBills).toBe(1);
  });
});
