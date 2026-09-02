import { contributesToFinancialMetrics, institutionDisplayName, isIncomeMovement } from '../../transactions/domain/transaction-policy';
import type { TransactionStatusCodeName } from '../../../domain/transaction-status';

export interface AnalyticsTransaction {
  amount: unknown; currency: string; category: string; merchant: string; statusCode: TransactionStatusCodeName;
  transactionType: string; source: string; institutionCode: string; transactionDate: Date;
}

const round = (value: number) => Math.round(value * 100) / 100;

export function summarizeTransactions(transactions: AnalyticsTransaction[], requestedCurrency: string, periodDays?: number) {
  let totalSpentDOP = 0, totalSpentUSD = 0, totalIncomeDOP = 0, totalIncomeUSD = 0;
  let approvedCount = 0, rejectedCount = 0, reversedCount = 0, pendingCount = 0, approvedExpenseCount = 0, totalTransactions = 0;
  const byCategoryMap: Record<string, { total: number; count: number }> = {};
  const byMerchantMap: Record<string, { total: number; totalDOP: number; totalUSD: number; count: number }> = {};
  const byInstitutionMap: Record<string, { total: number; count: number }> = {};
  const dailyTrendMap: Record<string, { total: number; count: number }> = {};

  for (const transaction of transactions) {
    const amount = Number(transaction.amount);
    const income = isIncomeMovement(transaction);
    if (income) continue;
    const matchesCurrency = transaction.currency.toUpperCase() === requestedCurrency;
    if (matchesCurrency) totalTransactions += 1;
    if (!matchesCurrency) {
      if (contributesToFinancialMetrics(transaction.statusCode)) {
        if (transaction.currency === 'USD') totalSpentUSD += amount; else totalSpentDOP += amount;
      }
      continue;
    }
    if (transaction.statusCode === 'DECLINED') rejectedCount += 1;
    else if (transaction.statusCode === 'REVERSED') reversedCount += 1;
    else if (transaction.statusCode === 'PENDING') pendingCount += 1;
    else approvedCount += 1;
    if (!contributesToFinancialMetrics(transaction.statusCode)) continue;
    approvedExpenseCount += 1;
    if (transaction.currency === 'USD') totalSpentUSD += amount; else totalSpentDOP += amount;
    const institution = institutionDisplayName(transaction.institutionCode);
    byInstitutionMap[institution] ||= { total: 0, count: 0 };
    byInstitutionMap[institution].count += 1;
    byInstitutionMap[institution].total += amount;
    byCategoryMap[transaction.category] ||= { total: 0, count: 0 };
    byCategoryMap[transaction.category].count += 1;
    byCategoryMap[transaction.category].total += amount;
    byMerchantMap[transaction.merchant] ||= { total: 0, totalDOP: 0, totalUSD: 0, count: 0 };
    const merchant = byMerchantMap[transaction.merchant];
    merchant.count += 1;
    if (transaction.currency === 'USD') merchant.totalUSD += amount; else merchant.totalDOP += amount;
    merchant.total += amount;
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santo_Domingo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(transaction.transactionDate);
    dailyTrendMap[date] ||= { total: 0, count: 0 };
    dailyTrendMap[date].total += amount; dailyTrendMap[date].count += 1;
  }
  const totalAmount = requestedCurrency === 'USD' ? totalSpentUSD : totalSpentDOP;
  const totalIncome = requestedCurrency === 'USD' ? totalIncomeUSD : totalIncomeDOP;
  const byCategory = Object.entries(byCategoryMap).map(([category, value]) => ({ category, total: round(value.total), count: value.count, percentage: totalAmount > 0 ? Math.round(value.total / totalAmount * 100) : 0 })).sort((a, b) => b.total - a.total);
  const topMerchants = Object.entries(byMerchantMap).map(([name, value]) => ({ name, merchant: name, total: round(value.total), totalDOP: round(value.totalDOP), totalUSD: round(value.totalUSD), count: value.count })).sort((a, b) => b.total - a.total).slice(0, 10);
  const byOrganization = Object.entries(byInstitutionMap).map(([organization, value]) => ({ organization, total: round(value.total), count: value.count, percentage: totalAmount > 0 ? Math.round(value.total / totalAmount * 100) : 0 })).sort((a, b) => b.total - a.total);
  const dailyTrend = Object.entries(dailyTrendMap).map(([date, value]) => ({ date, total: round(value.total), count: value.count })).sort((a, b) => a.date.localeCompare(b.date));
  return {
    totalAmount: round(totalAmount), totalIncome: round(totalIncome), totalSpentDOP: round(totalSpentDOP), totalSpentUSD: round(totalSpentUSD),
    totalIncomeDOP: round(totalIncomeDOP), totalIncomeUSD: round(totalIncomeUSD), approvedCount, rejectedCount, reversedCount, pendingCount,
    totalTransactions,
    dailyAverage: round(totalAmount / Math.max(periodDays ?? dailyTrend.length, 1)), averageTicket: approvedExpenseCount > 0 ? round(totalAmount / approvedExpenseCount) : 0,
    approvedExpenseCount,
    byCategory, byOrganization, topMerchants, dailyTrend,
  };
}
