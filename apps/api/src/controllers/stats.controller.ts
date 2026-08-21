import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { CreateCategoryRuleSchema } from '../schemas/transaction.schema';

export class StatsController {
  /**
   * GET /api/v1/stats/summary
   * Returns monthly aggregations, trends, and category distribution.
   */
  public static async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const month = req.query.month as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const organization = (req.query.organization as string) || (req.query.source as string);
      const requestedCurrency = ((req.query.currency as string) || 'DOP').toUpperCase();

      let dateFilter: any = {};
      if (startDate || endDate) {
        if (startDate) {
          const s = startDate.length === 10 ? new Date(`${startDate}T00:00:00.000Z`) : new Date(startDate);
          dateFilter.gte = s;
        }
        if (endDate) {
          const e = endDate.length === 10 ? new Date(`${endDate}T23:59:59.999Z`) : new Date(endDate);
          dateFilter.lte = e;
        }
      } else if (month && /^\d{4}-\d{2}$/.test(month)) {
        const [year, m] = month.split('-').map(Number);
        dateFilter = {
          gte: new Date(Date.UTC(year, m - 1, 1)),
          lte: new Date(Date.UTC(year, m, 0, 23, 59, 59, 999)),
        };
      }

      const where: any = Object.keys(dateFilter).length > 0 ? { transactionDate: dateFilter } : {};

      if (organization && organization.toUpperCase() !== 'ALL') {
        const orgUpper = organization.toUpperCase();
        if (orgUpper === 'BHD' || orgUpper === 'BANCO BHD') {
          where.source = { startsWith: 'BHD' };
        } else if (orgUpper === 'POPULAR' || orgUpper === 'BANCO POPULAR') {
          where.OR = [{ source: { contains: 'POPULAR' } }, { source: { contains: 'BPD' } }];
        } else if (orgUpper === 'BANRESERVAS') {
          where.source = { contains: 'BANRESERVAS' };
        } else if (orgUpper === 'QIK') {
          where.source = { contains: 'QIK' };
        } else {
          where.source = { contains: organization };
        }
      }

      const [transactions, totalCount] = await Promise.all([
        prisma.transaction.findMany({
          where,
          select: {
            amount: true,
            currency: true,
            category: true,
            merchant: true,
            status: true,
            transactionType: true,
            source: true,
            transactionDate: true,
          },
          orderBy: {
            transactionDate: 'asc',
          },
        }),
        prisma.transaction.count({ where }),
      ]);

      let totalSpentDOP = 0;
      let totalSpentUSD = 0;
      let totalIncomeDOP = 0;
      let totalIncomeUSD = 0;
      let approvedCount = 0;
      let rejectedCount = 0;

      const byCategoryMap: Record<string, { total: number; totalDOP: number; totalUSD: number; count: number }> = {};
      const byMerchantMap: Record<string, { total: number; totalDOP: number; totalUSD: number; count: number }> = {};
      const byOrgMap: Record<string, { total: number; totalDOP: number; totalUSD: number; count: number }> = {};
      const dailyTrendMap: Record<string, { total: number; count: number }> = {};

      for (const t of transactions) {
        const isRejected = /rechazad|declinad|denegad/i.test(t.status || '');
        const isIncome =
          /recibida/i.test(t.transactionType || '') ||
          /ingreso/i.test(t.category || '') ||
          t.source === 'BHD_TRANSFER_INCOME';

        if (isRejected) {
          rejectedCount++;
        } else {
          approvedCount++;
        }

        const isMatchingCurrency = t.currency.toUpperCase() === requestedCurrency;

        // Organization detection
        const srcUpper = (t.source || '').toUpperCase();
        let orgName = 'Banco BHD';
        if (srcUpper.includes('POPULAR') || srcUpper.includes('BPD')) orgName = 'Banco Popular';
        else if (srcUpper.includes('BANRESERVAS') || srcUpper.includes('RESERVAS')) orgName = 'Banreservas';
        else if (srcUpper.includes('QIK')) orgName = 'Qik Banco Digital';
        else if (srcUpper.includes('APAP')) orgName = 'APAP';
        else if (srcUpper.includes('SCOTIA')) orgName = 'Scotiabank';

        if (!byOrgMap[orgName]) {
          byOrgMap[orgName] = { total: 0, totalDOP: 0, totalUSD: 0, count: 0 };
        }
        if (t.currency === 'USD') byOrgMap[orgName].totalUSD += t.amount;
        else byOrgMap[orgName].totalDOP += t.amount;
        if (isMatchingCurrency && !isRejected && !isIncome) {
          byOrgMap[orgName].total += t.amount;
        }
        byOrgMap[orgName].count++;

        if (isIncome) {
          if (t.currency === 'USD') totalIncomeUSD += t.amount;
          else totalIncomeDOP += t.amount;
        } else {
          if (t.currency === 'USD') totalSpentUSD += t.amount;
          else totalSpentDOP += t.amount;
        }

        // Group by category (only for spending or all active)
        if (!byCategoryMap[t.category]) {
          byCategoryMap[t.category] = { total: 0, totalDOP: 0, totalUSD: 0, count: 0 };
        }
        if (t.currency === 'USD') {
          byCategoryMap[t.category].totalUSD += t.amount;
        } else {
          byCategoryMap[t.category].totalDOP += t.amount;
        }
        if (isMatchingCurrency && !isRejected) {
          byCategoryMap[t.category].total += t.amount;
        }
        byCategoryMap[t.category].count++;

        // Group by merchant
        if (!byMerchantMap[t.merchant]) {
          byMerchantMap[t.merchant] = { total: 0, totalDOP: 0, totalUSD: 0, count: 0 };
        }
        if (t.currency === 'USD') {
          byMerchantMap[t.merchant].totalUSD += t.amount;
        } else {
          byMerchantMap[t.merchant].totalDOP += t.amount;
        }
        if (isMatchingCurrency && !isRejected) {
          byMerchantMap[t.merchant].total += t.amount;
        }
        byMerchantMap[t.merchant].count++;

        // Daily trend for expenses
        if (isMatchingCurrency && !isRejected && !isIncome) {
          const dateKey = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Santo_Domingo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(new Date(t.transactionDate));

          if (!dailyTrendMap[dateKey]) {
            dailyTrendMap[dateKey] = { total: 0, count: 0 };
          }
          dailyTrendMap[dateKey].total += t.amount;
          dailyTrendMap[dateKey].count++;
        }
      }

      const totalAmount = requestedCurrency === 'USD' ? totalSpentUSD : totalSpentDOP;
      const totalIncome = requestedCurrency === 'USD' ? totalIncomeUSD : totalIncomeDOP;

      // Calculate category array with percentages
      const byCategory = Object.entries(byCategoryMap)
        .map(([category, data]) => ({
          category,
          total: Math.round(data.total * 100) / 100,
          count: data.count,
          percentage: totalAmount > 0 ? Math.round((data.total / totalAmount) * 100) : 0,
        }))
        .sort((a, b) => b.total - a.total);

      // Top merchants
      const topMerchants = Object.entries(byMerchantMap)
        .map(([name, data]) => ({
          name,
          merchant: name,
          total: Math.round(data.total * 100) / 100,
          totalDOP: Math.round(data.totalDOP * 100) / 100,
          totalUSD: Math.round(data.totalUSD * 100) / 100,
          count: data.count,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      // By organization array
      const byOrganization = Object.entries(byOrgMap)
        .map(([org, data]) => ({
          organization: org,
          total: Math.round(data.total * 100) / 100,
          count: data.count,
          percentage: totalAmount > 0 ? Math.round((data.total / totalAmount) * 100) : 0,
        }))
        .sort((a, b) => b.total - a.total);

      // Daily trend array
      const dailyTrend = Object.entries(dailyTrendMap)
        .map(([date, data]) => ({
          date,
          total: Math.round(data.total * 100) / 100,
          count: data.count,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const activeDays = Object.keys(dailyTrendMap).length || 1;
      const dailyAverage = Math.round((totalAmount / activeDays) * 100) / 100;
      const averageTicket = approvedCount > 0 ? Math.round((totalAmount / approvedCount) * 100) / 100 : 0;

      // Calculate previous period comparison (MoM / previous interval)
      let previousTotalAmount = 0;
      let previousTotalIncome = 0;

      if (dateFilter.gte && dateFilter.lte) {
        const currentStart = new Date(dateFilter.gte);
        const currentEnd = new Date(dateFilter.lte);
        const durationMs = currentEnd.getTime() - currentStart.getTime();

        const prevStart = new Date(currentStart.getTime() - durationMs - 1);
        const prevEnd = new Date(currentStart.getTime() - 1);

        const prevWhere = { ...where, transactionDate: { gte: prevStart, lte: prevEnd } };
        const prevTransactions = await prisma.transaction.findMany({
          where: prevWhere,
          select: {
            amount: true,
            currency: true,
            status: true,
            transactionType: true,
            source: true,
            category: true,
          },
        });

        for (const pt of prevTransactions) {
          const isRejected = /rechazad|declinad|denegad/i.test(pt.status);
          if (isRejected) continue;
          const isIncome =
            pt.source === 'BHD_TRANSFER_INCOME' ||
            /recibida/i.test(pt.transactionType) ||
            /recibida/i.test(pt.category);
          const isMatching = pt.currency === requestedCurrency;
          if (isMatching) {
            if (isIncome) previousTotalIncome += pt.amount;
            else previousTotalAmount += pt.amount;
          }
        }
      }

      let expenseChangePercent: number | null = null;
      if (previousTotalAmount > 0) {
        expenseChangePercent = Math.round(((totalAmount - previousTotalAmount) / previousTotalAmount) * 1000) / 10;
      }

      let incomeChangePercent: number | null = null;
      if (previousTotalIncome > 0) {
        incomeChangePercent = Math.round(((totalIncome - previousTotalIncome) / previousTotalIncome) * 1000) / 10;
      }

      res.status(200).json({
        success: true,
        data: {
          period: month || 'all-time',
          totalAmount: Math.round(totalAmount * 100) / 100,
          totalIncome: Math.round(totalIncome * 100) / 100,
          totalTransactions: totalCount,
          approvedCount,
          rejectedCount,
          currency: requestedCurrency,
          dailyAverage,
          averageTicket,
          totalSpentDOP: Math.round(totalSpentDOP * 100) / 100,
          totalSpentUSD: Math.round(totalSpentUSD * 100) / 100,
          totalIncomeDOP: Math.round(totalIncomeDOP * 100) / 100,
          totalIncomeUSD: Math.round(totalIncomeUSD * 100) / 100,
          comparison: {
            previousTotalAmount: Math.round(previousTotalAmount * 100) / 100,
            previousTotalIncome: Math.round(previousTotalIncome * 100) / 100,
            expenseChangePercent,
            incomeChangePercent,
          },
          byCategory,
          byMerchant: topMerchants,
          byOrganization,
          topMerchants,
          categoryBreakdown: byCategoryMap,
          dailyTrend,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/categories
   * List all unique categories and count of transactions in each.
   */
  public static async listCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await prisma.transaction.groupBy({
        by: ['category'],
        _count: {
          _all: true,
        },
      });

      res.status(200).json({
        success: true,
        data: categories.map((c) => ({
          category: c.category,
          count: c._count._all,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/rules
   * List custom categorization rules.
   */
  public static async listRules(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rules = await prisma.categoryRule.findMany({
        orderBy: { priority: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: rules,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/rules
   * Create a new category rule.
   */
  public static async createRule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = CreateCategoryRuleSchema.parse(req.body);
      const rule = await prisma.categoryRule.create({
        data: validated,
      });

      res.status(201).json({
        success: true,
        message: 'Category rule created successfully',
        data: rule,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/rules/:id
   * Delete a custom category rule.
   */
  public static async deleteRule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      await prisma.categoryRule.delete({ where: { id } });

      res.status(200).json({
        success: true,
        message: 'Category rule deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
