import type { IncomeFrequency } from '@bills/contracts';

export interface ProjectableIncomeStream {
  id: string;
  name: string;
  amount: number | string;
  currency: string;
  frequency: IncomeFrequency;
  dayOfMonth?: number | null;
  isActive: boolean;
}

const round = (val: number) => Math.round(val * 100) / 100;

export function calculateProjectedStreamMonthly(
  stream: ProjectableIncomeStream,
  targetCurrency: string,
): number {
  if (!stream.isActive) return 0;
  if (stream.currency.toUpperCase() !== targetCurrency.toUpperCase()) return 0;

  const baseAmount = Number(stream.amount) || 0;
  if (baseAmount <= 0) return 0;

  switch (stream.frequency) {
    case 'BIWEEKLY_15_30':
      // 2 payroll deposits per month (typical Dominican 15/30 cadence)
      return round(baseAmount * 2);
    case 'MONTHLY':
      return round(baseAmount);
    case 'WEEKLY':
      // 4 weekly cycles per month
      return round(baseAmount * 4);
    case 'CUSTOM':
    default:
      return round(baseAmount);
  }
}

export function projectTotalMonthlyIncome(
  streams: ProjectableIncomeStream[],
  targetCurrency: string,
): number {
  const sum = streams.reduce(
    (acc, stream) => acc + calculateProjectedStreamMonthly(stream, targetCurrency),
    0,
  );
  return round(sum);
}
