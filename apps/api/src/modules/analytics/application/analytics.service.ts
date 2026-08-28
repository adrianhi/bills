import { resolveDateRange, resolveInstitutionCode } from '../../transactions/domain/transaction-policy';
import { summarizeTransactions } from '../domain/summarize-transactions';
import { PrismaAnalyticsRepository } from '../infrastructure/prisma-analytics.repository';

export interface SummaryRequest { month?: string; startDate?: string; endDate?: string; organization?: string; currency?: string }

export class AnalyticsService {
  constructor(private readonly repository: PrismaAnalyticsRepository) {}
  async getSummary(workspaceId: string, request: SummaryRequest) {
    const range = resolveDateRange(request.month, request.startDate, request.endDate);
    const currency = (request.currency || 'DOP').toUpperCase();
    const institution = request.organization && request.organization.toUpperCase() !== 'ALL' ? resolveInstitutionCode(request.organization, request.organization) : undefined;
    const transactions = await this.repository.findTransactions(workspaceId, range, institution);
    const current = summarizeTransactions(transactions, currency);
    let previousTotalAmount = 0, previousTotalIncome = 0;
    if (range.gte && range.lte) {
      const duration = range.lte.getTime() - range.gte.getTime();
      const previous = await this.repository.findTransactions(workspaceId, { gte: new Date(range.gte.getTime() - duration - 1), lte: new Date(range.gte.getTime() - 1) }, institution);
      const summary = summarizeTransactions(previous, currency);
      previousTotalAmount = summary.totalAmount; previousTotalIncome = summary.totalIncome;
    }
    const percent = (value: number, previous: number) => previous > 0 ? Math.round((value - previous) / previous * 1000) / 10 : null;
    return { period: request.month || 'all-time', totalTransactions: transactions.length, currency, ...current, byMerchant: current.topMerchants,
      comparison: { previousTotalAmount, previousTotalIncome, expenseChangePercent: percent(current.totalAmount, previousTotalAmount), incomeChangePercent: percent(current.totalIncome, previousTotalIncome) } };
  }
  async listCategories(workspaceId: string) {
    const rows = await this.repository.listCategories(workspaceId);
    return rows.map((item) => ({ category: item.category, count: item._count._all }));
  }
}
