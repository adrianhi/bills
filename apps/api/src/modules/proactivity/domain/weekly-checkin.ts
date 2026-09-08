import type { TransactionDto, WeeklyCheckinDto } from '@bills/contracts';

export interface WeeklyExpensesInput {
  currency: 'DOP' | 'USD';
  currentWeekTransactions: TransactionDto[];
  previousWeekTransactions: TransactionDto[];
  daysToNextPayday: number;
  dailyAllowance: number;
  completedAt: string | null;
  weekKey: string;
  startDate: string;
  endDate: string;
}

export function computeWeeklyCheckin(input: WeeklyExpensesInput): WeeklyCheckinDto {
  const currentExpenses = input.currentWeekTransactions.filter((t) => t.statusCode === 'APPROVED');
  const previousExpenses = input.previousWeekTransactions.filter((t) => t.statusCode === 'APPROVED');

  const totalCurrent = Math.round(currentExpenses.reduce((sum, t) => sum + t.amount, 0) * 100) / 100;
  const totalPrevious = Math.round(previousExpenses.reduce((sum, t) => sum + t.amount, 0) * 100) / 100;

  const netDifference = Math.round((totalCurrent - totalPrevious) * 100) / 100;
  const changePercent = totalPrevious > 0
    ? Math.round(((totalCurrent - totalPrevious) / totalPrevious) * 100)
    : null;

  // Top Category
  const categoryTotals = new Map<string, number>();
  for (const t of currentExpenses) {
    const cat = t.category || 'Otros';
    categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + t.amount);
  }
  let topCategory: WeeklyCheckinDto['topCategory'] = null;
  if (categoryTotals.size > 0 && totalCurrent > 0) {
    const sorted = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1]);
    const [name, amount] = sorted[0];
    const percentage = Math.min(100, Math.round((amount / totalCurrent) * 100));
    topCategory = { name, amount: Math.round(amount * 100) / 100, percentage };
  }

  // Top Merchant
  const merchantTotals = new Map<string, number>();
  for (const t of currentExpenses) {
    const m = t.merchant || t.rawMerchant;
    merchantTotals.set(m, (merchantTotals.get(m) || 0) + t.amount);
  }
  let topMerchant: WeeklyCheckinDto['topMerchant'] = null;
  if (merchantTotals.size > 0) {
    const sorted = [...merchantTotals.entries()].sort((a, b) => b[1] - a[1]);
    const [name, amount] = sorted[0];
    topMerchant = { name, amount: Math.round(amount * 100) / 100 };
  }

  return {
    weekKey: input.weekKey,
    currency: input.currency,
    startDate: input.startDate,
    endDate: input.endDate,
    totalSpentThisWeek: totalCurrent,
    totalSpentPreviousWeek: totalPrevious,
    changePercent,
    netDifference,
    topCategory,
    topMerchant,
    daysToNextPayday: Math.max(0, input.daysToNextPayday),
    estimatedDailyAllowance: Math.round(input.dailyAllowance * 100) / 100,
    status: input.completedAt ? 'COMPLETED' : 'OPEN',
    completedAt: input.completedAt,
  };
}

export function resolveWeekPeriod(now = new Date()): {
  weekKey: string;
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date;
  previousEnd: Date;
  startDateStr: string;
  endDateStr: string;
  isCheckinDay: boolean; // Sunday or Monday
  daysToNextPayday: number;
} {
  const tz = 'America/Santo_Domingo';
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  const todayStr = fmt.format(now);
  const [year, month, day] = todayStr.split('-').map(Number);

  // Determine day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const d = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = d.getUTCDay();
  const isCheckinDay = dayOfWeek === 0 || dayOfWeek === 1;

  // We consider the week ending on Sunday
  const diffToLastSunday = dayOfWeek === 0 ? 0 : dayOfWeek; // days since last Sunday
  const sunday = new Date(d.getTime() - (dayOfWeek === 0 ? 0 : (dayOfWeek - 7)) * 86_400_000);
  const monday = new Date(sunday.getTime() - 6 * 86_400_000);

  const prevSunday = new Date(monday.getTime() - 86_400_000);
  const prevMonday = new Date(prevSunday.getTime() - 6 * 86_400_000);

  const toStr = (date: Date) => date.toISOString().slice(0, 10);
  const startDateStr = toStr(monday);
  const endDateStr = toStr(sunday);
  const weekKey = `${startDateStr}_${endDateStr}`;

  // Next payday (15 or end of month)
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  let daysToNextPayday = 0;
  if (day < 15) {
    daysToNextPayday = 15 - day;
  } else {
    daysToNextPayday = Math.max(0, lastDayOfMonth - day);
  }

  return {
    weekKey,
    currentStart: monday,
    currentEnd: new Date(sunday.getTime() + 86_399_999),
    previousStart: prevMonday,
    previousEnd: new Date(prevSunday.getTime() + 86_399_999),
    startDateStr,
    endDateStr,
    isCheckinDay,
    daysToNextPayday,
  };
}
