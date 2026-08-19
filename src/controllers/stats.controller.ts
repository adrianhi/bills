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
            transactionDate: true,
          },
        }),
        prisma.transaction.count({ where }),
      ]);

      let totalDOP = 0;
      let totalUSD = 0;
      const byCategory: Record<string, { totalDOP: number; totalUSD: number; count: number }> = {};
      const byMerchant: Record<string, { totalDOP: number; totalUSD: number; count: number }> = {};

      for (const t of transactions) {
        if (t.currency === 'USD') {
          totalUSD += t.amount;
        } else {
          totalDOP += t.amount;
        }

        // Group by category
        if (!byCategory[t.category]) {
          byCategory[t.category] = { totalDOP: 0, totalUSD: 0, count: 0 };
        }
        if (t.currency === 'USD') {
          byCategory[t.category].totalUSD += t.amount;
        } else {
          byCategory[t.category].totalDOP += t.amount;
        }
        byCategory[t.category].count++;

        // Group by merchant
        if (!byMerchant[t.merchant]) {
          byMerchant[t.merchant] = { totalDOP: 0, totalUSD: 0, count: 0 };
        }
        if (t.currency === 'USD') {
          byMerchant[t.merchant].totalUSD += t.amount;
        } else {
          byMerchant[t.merchant].totalDOP += t.amount;
        }
        byMerchant[t.merchant].count++;
      }

      // Sort top merchants by DOP
      const topMerchants = Object.entries(byMerchant)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.totalDOP - a.totalDOP)
        .slice(0, 10);

      res.status(200).json({
        success: true,
        data: {
          period: month || 'all-time',
          totalTransactions: totalCount,
          totalSpentDOP: Math.round(totalDOP * 100) / 100,
          totalSpentUSD: Math.round(totalUSD * 100) / 100,
          categoryBreakdown: byCategory,
          topMerchants,
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
