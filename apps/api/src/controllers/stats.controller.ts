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
      const requestedCurrency = ((req.query.currency as string) || 'DOP').toUpperCase();

      let dateFilter = {};
      if (month && /^\d{4}-\d{2}$/.test(month)) {
        const [year, m] = month.split('-').map(Number);
        dateFilter = {
          gte: new Date(Date.UTC(year, m - 1, 1)),
          lte: new Date(Date.UTC(year, m, 0, 23, 59, 59, 999)),
        };
      }

      const where = month ? { transactionDate: dateFilter } : {};

      const [transactions, totalCount] = await Promise.all([
        prisma.transaction.findMany({
          where,
          select: {
            amount: true,
            currency: true,
            category: true,
            merchant: true,
            status: true,
            transactionDate: true,
          },
          orderBy: {
            transactionDate: 'asc',
          },
        }),
        prisma.transaction.count({ where }),
      ]);

      let totalDOP = 0;
      let totalUSD = 0;
      let approvedCount = 0;
      let rejectedCount = 0;

      const byCategoryMap: Record<string, { total: number; totalDOP: number; totalUSD: number; count: number }> = {};
      const byMerchantMap: Record<string, { total: number; totalDOP: number; totalUSD: number; count: number }> = {};
      const dailyTrendMap: Record<string, { total: number; count: number }> = {};

      for (const t of transactions) {
        const isRejected = /rechazad|declinad|denegad/i.test(t.status || '');
        if (isRejected) {
          rejectedCount++;
        } else {
          approvedCount++;
        }

        if (t.currency === 'USD') {
          totalUSD += t.amount;
        } else {
          totalDOP += t.amount;
        }

        const isMatchingCurrency = t.currency.toUpperCase() === requestedCurrency;

        // Group by category
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

        // Daily trend (Santo Domingo local time YYYY-MM-DD)
        if (isMatchingCurrency && !isRejected) {
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

      const totalAmount = requestedCurrency === 'USD' ? totalUSD : totalDOP;

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

      res.status(200).json({
        success: true,
        data: {
          period: month || 'all-time',
          totalAmount: Math.round(totalAmount * 100) / 100,
          totalTransactions: totalCount,
          approvedCount,
          rejectedCount,
          currency: requestedCurrency,
          dailyAverage,
          totalSpentDOP: Math.round(totalDOP * 100) / 100,
          totalSpentUSD: Math.round(totalUSD * 100) / 100,
          byCategory,
          byMerchant: topMerchants,
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
