import type { SafeToSpendDto } from '@bills/contracts';

const round = (value: number) => Math.round(value * 100) / 100;

export interface SafeToSpendInput {
  date: string;
  month: string;
  currency: 'DOP' | 'USD';
  dayOfMonth: number;
  daysInMonth: number;
  globalLimit: number | null;
  spentBeforeToday: number;
  spentToday: number;
  futureConfirmedCommitments: number;
}

export function calculateSafeToSpend(input: SafeToSpendInput): SafeToSpendDto {
  const daysRemaining = input.daysInMonth - input.dayOfMonth + 1;
  if (input.globalLimit === null) return {
    date: input.date, month: input.month, currency: input.currency,
    status: 'UNSET', reason: 'BUDGET_UNSET', globalLimit: null,
    spentBeforeToday: round(input.spentBeforeToday), spentToday: round(input.spentToday),
    futureConfirmedCommitments: round(input.futureConfirmedCommitments), daysRemaining,
    dailyAllowance: 0, todayAvailable: 0, todayOverage: 0, nextDailyAllowance: 0,
  };

  const availableAtStart = Math.max(
    input.globalLimit - input.spentBeforeToday - input.futureConfirmedCommitments,
    0,
  );
  const dailyAllowance = availableAtStart / daysRemaining;
  const todayAvailable = Math.max(dailyAllowance - input.spentToday, 0);
  const todayOverage = Math.max(input.spentToday - dailyAllowance, 0);
  const remainingAfterToday = Math.max(
    input.globalLimit - input.spentBeforeToday - input.spentToday - input.futureConfirmedCommitments,
    0,
  );
  const actualSpent = input.spentBeforeToday + input.spentToday;
  const status = actualSpent >= input.globalLimit ? 'EXCEEDED'
    : todayOverage > 0 || availableAtStart === 0 ? 'ADJUSTING'
      : 'SURPLUS';
  const reason = status === 'EXCEEDED' ? 'BUDGET_EXCEEDED'
    : todayOverage > 0 ? 'OVER_DAILY_ALLOWANCE'
      : input.futureConfirmedCommitments > 0 ? 'UPCOMING_COMMITMENTS'
        : 'NONE';

  return {
    date: input.date, month: input.month, currency: input.currency,
    status, reason, globalLimit: round(input.globalLimit),
    spentBeforeToday: round(input.spentBeforeToday), spentToday: round(input.spentToday),
    futureConfirmedCommitments: round(input.futureConfirmedCommitments), daysRemaining,
    dailyAllowance: round(dailyAllowance), todayAvailable: round(todayAvailable),
    todayOverage: round(todayOverage),
    nextDailyAllowance: round(daysRemaining > 1 ? remainingAfterToday / (daysRemaining - 1) : 0),
  };
}
