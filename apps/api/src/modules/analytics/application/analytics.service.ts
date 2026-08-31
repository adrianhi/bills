import { resolveDateRange, resolveInstitutionCode } from '../../transactions/domain/transaction-policy';
import { resolveComparisonPeriods, type ComparablePeriod } from '../domain/comparison-period';
import { summarizeTransactions } from '../domain/summarize-transactions';
import { PrismaAnalyticsRepository } from '../infrastructure/prisma-analytics.repository';

export interface SummaryRequest { month?: string; startDate?: string; endDate?: string; organization?: string; currency?: string }

type Summary = ReturnType<typeof summarizeTransactions>;

type BaseSummary = Summary & { period: string; currency: string; byMerchant: Summary['topMerchants'] };

export interface SpendingInsight {
  code: string;
  tone: 'positive' | 'warning' | 'neutral';
  title: string;
  description: string;
  metric?: { value: number; currency?: string; changePercent?: number | null };
}

interface PeriodDetail {
  startDate: string;
  endDate: string;
  days: number;
  totalAmount: number;
  totalIncome: number;
  dailyAverage: number;
  transactionCount: number;
}

export interface SummaryComparison {
  previousTotalAmount: number;
  previousTotalIncome: number;
  expenseChangeAmount: number;
  expenseChangePercent: number | null;
  incomeChangePercent: number | null;
  currentPeriod: PeriodDetail;
  previousPeriod: PeriodDetail;
  categoryDeltas: ReturnType<typeof deltas>;
  merchantDeltas: ReturnType<typeof deltas>;
}

export type SummaryResult = BaseSummary & {
  comparisonBasis: 'EQUIVALENT_PREVIOUS_PERIOD' | null;
  comparison?: SummaryComparison;
  insights: SpendingInsight[];
};

const round = (value: number) => Math.round(value * 100) / 100;
const percent = (value: number, previous: number) => previous > 0 ? Math.round((value - previous) / previous * 1000) / 10 : null;

function deltas(
  current: Array<{ total: number; [key: string]: unknown }>,
  previous: Array<{ total: number; [key: string]: unknown }>,
  key: 'category' | 'merchant',
) {
  const currentMap = new Map(current.map((item) => [String(item[key]), item.total]));
  const previousMap = new Map(previous.map((item) => [String(item[key]), item.total]));
  return [...new Set([...currentMap.keys(), ...previousMap.keys()])]
    .map((name) => {
      const currentTotal = currentMap.get(name) ?? 0;
      const previousTotal = previousMap.get(name) ?? 0;
      return { name, currentTotal, previousTotal, changeAmount: round(currentTotal - previousTotal), changePercent: percent(currentTotal, previousTotal) };
    })
    .filter((item) => item.currentTotal > 0 || item.previousTotal > 0)
    .sort((a, b) => b.changeAmount - a.changeAmount)
    .slice(0, 10);
}

function periodSummary(period: ComparablePeriod, summary: Summary) {
  return {
    startDate: period.startDate,
    endDate: period.endDate,
    days: period.days,
    totalAmount: summary.totalAmount,
    totalIncome: summary.totalIncome,
    dailyAverage: summary.dailyAverage,
    transactionCount: summary.totalTransactions,
  };
}

function buildInsights(currency: string, period: ComparablePeriod, current: Summary, previous: Summary, categoryDeltas: ReturnType<typeof deltas>, merchantDeltas: ReturnType<typeof deltas>) {
  if (current.approvedExpenseCount < 3) return [];
  const insights: Array<{ code: string; tone: 'positive' | 'warning' | 'neutral'; title: string; description: string; metric?: { value: number; currency?: string; changePercent?: number | null } }> = [];
  const expenseChange = percent(current.totalAmount, previous.totalAmount);
  if (expenseChange !== null) {
    const stable = Math.abs(expenseChange) < 5;
    insights.push({
      code: stable ? 'SPENDING_STABLE' : expenseChange > 0 ? 'SPENDING_INCREASED' : 'SPENDING_DECREASED',
      tone: stable ? 'neutral' : expenseChange > 0 ? 'warning' : 'positive',
      title: stable ? 'Tu gasto se mantiene estable' : expenseChange > 0 ? 'Gastaste más que en el período anterior' : 'Reduciste tus gastos',
      description: stable ? 'La variación es menor al 5% frente al período equivalente.' : `La diferencia es de ${Math.abs(round(current.totalAmount - previous.totalAmount)).toLocaleString('es-DO')} ${currency}.`,
      metric: { value: round(current.totalAmount - previous.totalAmount), currency, changePercent: expenseChange },
    });
  }

  const categoryDriver = categoryDeltas.find((item) => item.changeAmount > 0) ?? categoryDeltas.find((item) => item.changeAmount < 0);
  if (categoryDriver) {
    insights.push({
      code: categoryDriver.changeAmount > 0 ? 'CATEGORY_INCREASE_DRIVER' : 'CATEGORY_SAVING_DRIVER',
      tone: categoryDriver.changeAmount > 0 ? 'warning' : 'positive',
      title: categoryDriver.changeAmount > 0 ? `${categoryDriver.name} explica el mayor aumento` : `${categoryDriver.name} tuvo la mayor reducción`,
      description: `${Math.abs(categoryDriver.changeAmount).toLocaleString('es-DO')} ${currency} ${categoryDriver.changeAmount > 0 ? 'más' : 'menos'} que en el período anterior.`,
      metric: { value: categoryDriver.changeAmount, currency, changePercent: categoryDriver.changePercent },
    });
  }

  if (period.isCurrentMonth && period.days >= 5 && current.approvedExpenseCount >= 5) {
    const projected = round(current.dailyAverage * period.monthDays);
    insights.push({
      code: 'MONTH_END_PACE', tone: 'neutral', title: 'Ritmo estimado al cierre del mes',
      description: `Si mantienes el promedio diario, cerrarías cerca de ${projected.toLocaleString('es-DO')} ${currency}. Es una proyección, no un presupuesto.`,
      metric: { value: projected, currency },
    });
  } else {
    const merchantDriver = merchantDeltas.find((item) => item.changeAmount > 0);
    if (merchantDriver) insights.push({
      code: 'MERCHANT_INCREASE_DRIVER', tone: 'neutral', title: `${merchantDriver.name} ganó peso en tus gastos`,
      description: `${merchantDriver.changeAmount.toLocaleString('es-DO')} ${currency} más que en el período anterior.`,
      metric: { value: merchantDriver.changeAmount, currency, changePercent: merchantDriver.changePercent },
    });
  }
  return insights.slice(0, 3);
}

export class AnalyticsService {
  constructor(private readonly repository: PrismaAnalyticsRepository) {}
  async getSummary(workspaceId: string, request: SummaryRequest) {
    const currency = (request.currency || 'DOP').toUpperCase();
    const institution = request.organization && request.organization.toUpperCase() !== 'ALL' ? resolveInstitutionCode(request.organization, request.organization) : undefined;
    const periods = resolveComparisonPeriods(request);
    const range = periods?.current.range ?? resolveDateRange(request.month, request.startDate, request.endDate);
    const transactions = await this.repository.findTransactions(workspaceId, range, institution);
    const current = summarizeTransactions(transactions, currency, periods?.current.days);
    const base = { period: request.month || (request.startDate && request.endDate ? `${request.startDate}:${request.endDate}` : 'all-time'), currency, ...current, byMerchant: current.topMerchants };
    if (!periods) return { ...base, comparisonBasis: null, insights: [] };

    const previousTransactions = await this.repository.findTransactions(workspaceId, periods.previous.range, institution);
    const previous = summarizeTransactions(previousTransactions, currency, periods.previous.days);
    const categoryDeltas = deltas(current.byCategory, previous.byCategory, 'category');
    const merchantDeltas = deltas(current.topMerchants, previous.topMerchants, 'merchant');
    return {
      ...base,
      comparisonBasis: 'EQUIVALENT_PREVIOUS_PERIOD' as const,
      comparison: {
        previousTotalAmount: previous.totalAmount,
        previousTotalIncome: previous.totalIncome,
        expenseChangeAmount: round(current.totalAmount - previous.totalAmount),
        expenseChangePercent: percent(current.totalAmount, previous.totalAmount),
        incomeChangePercent: percent(current.totalIncome, previous.totalIncome),
        currentPeriod: periodSummary(periods.current, current),
        previousPeriod: periodSummary(periods.previous, previous),
        categoryDeltas,
        merchantDeltas,
      },
      insights: buildInsights(currency, periods.current, current, previous, categoryDeltas, merchantDeltas),
    };
  }
  async listCategories(workspaceId: string) {
    const rows = await this.repository.listCategories(workspaceId);
    return rows.map((item) => ({ category: item.category, count: item._count._all }));
  }
}
