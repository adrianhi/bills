import type { ComparablePeriod } from './comparison-period';
import type { summarizeTransactions } from './summarize-transactions';
import { changePercent, roundAmount, selectChangeDriver, type SpendingDelta } from './spending-comparison';

type Summary = ReturnType<typeof summarizeTransactions>;

export interface SpendingInsight {
  code: string;
  tone: 'positive' | 'warning' | 'neutral';
  title: string;
  description: string;
  metric?: { value: number; currency?: string; changePercent?: number | null };
}

export function buildInsights(
  currency: string, period: ComparablePeriod, current: Summary, previous: Summary,
  categoryDeltas: SpendingDelta[], merchantDeltas: SpendingDelta[],
): SpendingInsight[] {
  if (current.approvedExpenseCount < 3 || previous.approvedExpenseCount === 0 || previous.totalAmount <= 0) return [];
  const insights: SpendingInsight[] = [];
  const expenseChange = changePercent(current.totalAmount, previous.totalAmount)!;
  const netChange = roundAmount(current.totalAmount - previous.totalAmount);
  const stable = Math.abs(expenseChange) < 5;
  insights.push({
    code: stable ? 'SPENDING_STABLE' : expenseChange > 0 ? 'SPENDING_INCREASED' : 'SPENDING_DECREASED',
    tone: stable ? 'neutral' : expenseChange > 0 ? 'warning' : 'positive',
    title: stable ? 'Tu gasto se mantiene estable' : expenseChange > 0 ? 'Gastaste más que en el período anterior' : 'Reduciste tus gastos',
    description: stable ? 'La variación es menor al 5% frente al período equivalente.' : `La diferencia es de ${Math.abs(netChange).toLocaleString('es-DO')} ${currency}.`,
    metric: { value: netChange, currency, changePercent: expenseChange },
  });

  const categoryDriver = selectChangeDriver(categoryDeltas, netChange);
  if (categoryDriver) insights.push({
    code: categoryDriver.changeAmount > 0 ? 'CATEGORY_INCREASE_DRIVER' : 'CATEGORY_SAVING_DRIVER',
    tone: categoryDriver.changeAmount > 0 ? 'warning' : 'positive',
    title: categoryDriver.changeAmount > 0 ? `${categoryDriver.name} explica el mayor aumento` : `${categoryDriver.name} tuvo la mayor reducción`,
    description: `${Math.abs(categoryDriver.changeAmount).toLocaleString('es-DO')} ${currency} ${categoryDriver.changeAmount > 0 ? 'más' : 'menos'} que en el período anterior.`,
    metric: { value: categoryDriver.changeAmount, currency, changePercent: categoryDriver.changePercent },
  });

  if (period.isCurrentMonth && period.days >= 5 && current.approvedExpenseCount >= 5) {
    const projected = roundAmount(current.dailyAverage * period.monthDays);
    insights.push({
      code: 'MONTH_END_PACE', tone: 'neutral', title: 'Ritmo estimado al cierre del mes',
      description: `Si mantienes el promedio diario, cerrarías cerca de ${projected.toLocaleString('es-DO')} ${currency}. Es una proyección, no un presupuesto.`,
      metric: { value: projected, currency },
    });
  } else if (netChange > 0) {
    const merchantDriver = selectChangeDriver(merchantDeltas, netChange);
    if (merchantDriver) insights.push({
      code: 'MERCHANT_INCREASE_DRIVER', tone: 'neutral', title: `${merchantDriver.name} ganó peso en tus gastos`,
      description: `${merchantDriver.changeAmount.toLocaleString('es-DO')} ${currency} más que en el período anterior.`,
      metric: { value: merchantDriver.changeAmount, currency, changePercent: merchantDriver.changePercent },
    });
  }
  return insights.slice(0, 3);
}
