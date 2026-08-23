import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { CreateCategoryRuleSchema } from '../schemas/transaction.schema';
import { TransactionService } from '../services/transaction.service';

type StatsTransaction = {
  amount: Prisma.Decimal;
  currency: string;
  category: string;
  merchant: string;
  status: string;
  transactionType: string;
  source: string;
  institutionCode: string;
  transactionDate: Date;
};

function resolveDateFilter(month?: string, startDate?: string, endDate?: string) {
  const filter: Prisma.DateTimeFilter = {};
  if (startDate || endDate) {
    if (startDate) {
      filter.gte = new Date(startDate.length === 10 ? `${startDate}T00:00:00.000Z` : startDate);
    }
    if (endDate) {
      filter.lte = new Date(endDate.length === 10 ? `${endDate}T23:59:59.999Z` : endDate);
    }
  } else if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [year, value] = month.split('-').map(Number);
    filter.gte = new Date(Date.UTC(year, value - 1, 1));
    filter.lte = new Date(Date.UTC(year, value, 0, 23, 59, 59, 999));
  }
  return filter;
}

function isRejected(transaction: Pick<StatsTransaction, 'status'>) {
  return /rechazad|declinad|denegad/i.test(transaction.status || '');
}

function isIncome(transaction: Pick<StatsTransaction, 'transactionType' | 'category' | 'source'>) {
  return (
    /recibida/i.test(transaction.transactionType || '') ||
    /ingreso/i.test(transaction.category || '') ||
    transaction.source === 'BHD_TRANSFER_INCOME'
  );
}

function summarize(transactions: StatsTransaction[], requestedCurrency: string) {
  let totalSpentDOP = 0;
  let totalSpentUSD = 0;
  let totalIncomeDOP = 0;
  let totalIncomeUSD = 0;
  let approvedCount = 0;
  let rejectedCount = 0;
  const byCategoryMap: Record<string, { total: number; count: number }> = {};
  const byMerchantMap: Record<string, { total: number; totalDOP: number; totalUSD: number; count: number }> = {};
  const byInstitutionMap: Record<string, { total: number; count: number }> = {};
  const dailyTrendMap: Record<string, { total: number; count: number }> = {};

  for (const transaction of transactions) {
    const amount = Number(transaction.amount);
    const rejected = isRejected(transaction);
    const income = isIncome(transaction);
    const matchesCurrency = transaction.currency.toUpperCase() === requestedCurrency;

    if (rejected) rejectedCount += 1;
    else approvedCount += 1;
    if (income) {
      if (transaction.currency === 'USD') totalIncomeUSD += amount;
      else totalIncomeDOP += amount;
    } else if (transaction.currency === 'USD') totalSpentUSD += amount;
    else totalSpentDOP += amount;

    const institutionName = TransactionService.getOrganization(transaction.institutionCode);
    byInstitutionMap[institutionName] ||= { total: 0, count: 0 };
    byInstitutionMap[institutionName].count += 1;
    if (matchesCurrency && !rejected && !income) byInstitutionMap[institutionName].total += amount;

    byCategoryMap[transaction.category] ||= { total: 0, count: 0 };
    byCategoryMap[transaction.category].count += 1;
    if (matchesCurrency && !rejected && !income) byCategoryMap[transaction.category].total += amount;

    byMerchantMap[transaction.merchant] ||= { total: 0, totalDOP: 0, totalUSD: 0, count: 0 };
    const merchant = byMerchantMap[transaction.merchant];
    merchant.count += 1;
    if (transaction.currency === 'USD') merchant.totalUSD += amount;
    else merchant.totalDOP += amount;
    if (matchesCurrency && !rejected && !income) merchant.total += amount;

    if (matchesCurrency && !rejected && !income) {
      const date = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Santo_Domingo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(transaction.transactionDate);
      dailyTrendMap[date] ||= { total: 0, count: 0 };
      dailyTrendMap[date].total += amount;
      dailyTrendMap[date].count += 1;
    }
  }

  const totalAmount = requestedCurrency === 'USD' ? totalSpentUSD : totalSpentDOP;
  const totalIncome = requestedCurrency === 'USD' ? totalIncomeUSD : totalIncomeDOP;
  const round = (value: number) => Math.round(value * 100) / 100;
  const byCategory = Object.entries(byCategoryMap)
    .map(([category, value]) => ({
      category,
      total: round(value.total),
      count: value.count,
      percentage: totalAmount > 0 ? Math.round((value.total / totalAmount) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
  const topMerchants = Object.entries(byMerchantMap)
    .map(([name, value]) => ({
      name,
      merchant: name,
      total: round(value.total),
      totalDOP: round(value.totalDOP),
      totalUSD: round(value.totalUSD),
      count: value.count,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
  const byOrganization = Object.entries(byInstitutionMap)
    .map(([organization, value]) => ({
      organization,
      total: round(value.total),
      count: value.count,
      percentage: totalAmount > 0 ? Math.round((value.total / totalAmount) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
  const dailyTrend = Object.entries(dailyTrendMap)
    .map(([date, value]) => ({ date, total: round(value.total), count: value.count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalAmount: round(totalAmount),
    totalIncome: round(totalIncome),
    totalSpentDOP: round(totalSpentDOP),
    totalSpentUSD: round(totalSpentUSD),
    totalIncomeDOP: round(totalIncomeDOP),
    totalIncomeUSD: round(totalIncomeUSD),
    approvedCount,
    rejectedCount,
    dailyAverage: round(totalAmount / Math.max(dailyTrend.length, 1)),
    averageTicket: approvedCount > 0 ? round(totalAmount / approvedCount) : 0,
    byCategory,
    byOrganization,
    topMerchants,
    dailyTrend,
  };
}

const transactionSelection = {
  amount: true,
  currency: true,
  category: true,
  merchant: true,
  status: true,
  transactionType: true,
  source: true,
  institutionCode: true,
  transactionDate: true,
} as const;

export class StatsController {
  public static async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.auth!.workspaceId!;
      const month = req.query.month as string | undefined;
      const dateFilter = resolveDateFilter(
        month,
        req.query.startDate as string | undefined,
        req.query.endDate as string | undefined
      );
      const organization = (req.query.organization || req.query.institutionCode) as string | undefined;
      const requestedCurrency = String(req.query.currency || 'DOP').toUpperCase();
      const where: Prisma.TransactionWhereInput = {
        workspaceId,
        ...(Object.keys(dateFilter).length ? { transactionDate: dateFilter } : {}),
        ...(organization && organization.toUpperCase() !== 'ALL'
          ? { institutionCode: TransactionService.resolveInstitutionCode(organization, organization) }
          : {}),
      };
      const transactions = await prisma.transaction.findMany({
        where,
        select: transactionSelection,
        orderBy: { transactionDate: 'asc' },
      });
      const current = summarize(transactions, requestedCurrency);
      let previousTotalAmount = 0;
      let previousTotalIncome = 0;

      if (dateFilter.gte && dateFilter.lte) {
        const currentStart = new Date(dateFilter.gte as Date);
        const currentEnd = new Date(dateFilter.lte as Date);
        const duration = currentEnd.getTime() - currentStart.getTime();
        const previous = await prisma.transaction.findMany({
          where: {
            ...where,
            transactionDate: {
              gte: new Date(currentStart.getTime() - duration - 1),
              lte: new Date(currentStart.getTime() - 1),
            },
          },
          select: transactionSelection,
        });
        const previousSummary = summarize(previous, requestedCurrency);
        previousTotalAmount = previousSummary.totalAmount;
        previousTotalIncome = previousSummary.totalIncome;
      }

      const percent = (value: number, previous: number) =>
        previous > 0 ? Math.round(((value - previous) / previous) * 1000) / 10 : null;
      res.status(200).json({
        success: true,
        data: {
          period: month || 'all-time',
          totalTransactions: transactions.length,
          currency: requestedCurrency,
          ...current,
          byMerchant: current.topMerchants,
          comparison: {
            previousTotalAmount,
            previousTotalIncome,
            expenseChangePercent: percent(current.totalAmount, previousTotalAmount),
            incomeChangePercent: percent(current.totalIncome, previousTotalIncome),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async listCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await prisma.transaction.groupBy({
        by: ['category'],
        where: { workspaceId: req.auth!.workspaceId! },
        _count: { _all: true },
      });
      res.status(200).json({
        success: true,
        data: categories.map((item) => ({ category: item.category, count: item._count._all })),
      });
    } catch (error) {
      next(error);
    }
  }

  public static async listRules(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rules = await prisma.categoryRule.findMany({
        where: { workspaceId: req.auth!.workspaceId! },
        orderBy: { priority: 'desc' },
      });
      res.status(200).json({ success: true, data: rules });
    } catch (error) {
      next(error);
    }
  }

  public static async createRule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = CreateCategoryRuleSchema.parse(req.body);
      const rule = await prisma.categoryRule.create({
        data: { ...validated, workspaceId: req.auth!.workspaceId! },
      });
      res.status(201).json({ success: true, message: 'Category rule created successfully', data: rule });
    } catch (error) {
      next(error);
    }
  }

  public static async deleteRule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await prisma.categoryRule.deleteMany({
        where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId! },
      });
      if (result.count === 0) {
        res.status(404).json({
          success: false,
          error: { code: 'RESOURCE_NOT_FOUND', message: 'Rule not found' },
        });
        return;
      }
      res.status(200).json({ success: true, message: 'Category rule deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}
