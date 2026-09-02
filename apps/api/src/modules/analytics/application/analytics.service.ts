import { resolveComparisonPeriods, type ComparablePeriod, type ComparisonPeriods } from '../domain/comparison-period';
import { summarizeTransactions } from '../domain/summarize-transactions';
import { changePercent, roundAmount, spendingDeltas, type SpendingDelta } from '../domain/spending-comparison';
import { buildInsights, type SpendingInsight } from '../domain/spending-insights';

export type { SpendingInsight } from '../domain/spending-insights';

export interface SummaryRequest {
  month?: string; startDate?: string; endDate?: string;
  organization?: string; institutionCode?: string; institutionCodes?: string[];
  currency?: string; category?: string; status?: string; transactionType?: string; search?: string;
}

interface AnalyticsRepository {
  findTransactions(workspaceId: string, request: SummaryRequest): Promise<Parameters<typeof summarizeTransactions>[0]>;
  listCategories(workspaceId: string): Promise<Array<{ category: string; _count: { _all: number } }>>;
}

type Summary = ReturnType<typeof summarizeTransactions>;
type BaseSummary = Omit<Summary, 'allMerchants'> & { period: string; currency: string; byMerchant: Summary['topMerchants'] };

interface PeriodDetail {
  startDate: string; endDate: string; days: number; totalAmount: number;
  totalIncome: number; dailyAverage: number; transactionCount: number;
}

export interface SummaryComparison {
  previousTotalAmount: number; previousTotalIncome: number;
  expenseChangeAmount: number; expenseChangePercent: number | null; incomeChangePercent: number | null;
  currentPeriod: PeriodDetail; previousPeriod: PeriodDetail;
  categoryDeltas: SpendingDelta[]; merchantDeltas: SpendingDelta[];
}

export type SummaryResult = BaseSummary & {
  comparisonBasis: 'EQUIVALENT_PREVIOUS_PERIOD' | null;
  comparison?: SummaryComparison;
  insights: SpendingInsight[];
};

function periodSummary(period: ComparablePeriod, summary: Summary): PeriodDetail {
  return { startDate: period.startDate, endDate: period.endDate, days: period.days,
    totalAmount: summary.totalAmount, totalIncome: summary.totalIncome,
    dailyAverage: summary.dailyAverage, transactionCount: summary.totalTransactions };
}

export class AnalyticsService {
  constructor(private readonly repository: AnalyticsRepository) {}

  async getSummary(
    workspaceId: string, request: SummaryRequest,
    periods: ComparisonPeriods | null = resolveComparisonPeriods(request),
  ): Promise<SummaryResult> {
    const currency = (request.currency || 'DOP').toUpperCase();
    const currentRequest = periods ? {
      ...request, month: undefined, startDate: periods.current.startDate, endDate: periods.current.endDate,
    } : request;
    const transactions = await this.repository.findTransactions(workspaceId, currentRequest);
    const current = summarizeTransactions(transactions, currency, periods?.current.days);
    const { allMerchants, ...visibleSummary } = current;
    const base = { period: request.month || (request.startDate && request.endDate ? `${request.startDate}:${request.endDate}` : 'all-time'), currency, ...visibleSummary, byMerchant: current.topMerchants };
    if (!periods) return { ...base, comparisonBasis: null, insights: [] };

    const previousTransactions = await this.repository.findTransactions(workspaceId, {
      ...request, month: undefined, startDate: periods.previous.startDate, endDate: periods.previous.endDate,
    });
    const previous = summarizeTransactions(previousTransactions, currency, periods.previous.days);
    const categoryDeltas = spendingDeltas(current.byCategory, previous.byCategory, (item) => item.category);
    const merchantDeltas = spendingDeltas(allMerchants, previous.allMerchants, (item) => item.merchant);
    return {
      ...base, comparisonBasis: 'EQUIVALENT_PREVIOUS_PERIOD',
      comparison: {
        previousTotalAmount: previous.totalAmount, previousTotalIncome: previous.totalIncome,
        expenseChangeAmount: roundAmount(current.totalAmount - previous.totalAmount),
        expenseChangePercent: changePercent(current.totalAmount, previous.totalAmount),
        incomeChangePercent: changePercent(current.totalIncome, previous.totalIncome),
        currentPeriod: periodSummary(periods.current, current), previousPeriod: periodSummary(periods.previous, previous),
        categoryDeltas: categoryDeltas.slice(0, 10), merchantDeltas: merchantDeltas.slice(0, 10),
      },
      insights: buildInsights(currency, periods.current, current, previous, categoryDeltas, merchantDeltas),
    };
  }

  async listCategories(workspaceId: string) {
    const rows = await this.repository.listCategories(workspaceId);
    return rows.map((item) => ({ category: item.category, count: item._count._all }));
  }
}
