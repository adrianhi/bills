import { prisma } from '../config/database';
import { CategorizationService } from './categorization.service';
import {
  CreateTransactionInput,
  TransactionQueryInput,
  UpdateTransactionInput,
  ExportQueryInput,
} from '../schemas/transaction.schema';
import { Prisma } from '@prisma/client';

export class TransactionService {
  /**
   * Ingests a single transaction idempotently.
   * If externalId exists, returns existing record with isDuplicate = true.
   */
  public static async createTransaction(data: CreateTransactionInput) {
    // 1. Check for existing transaction by externalId (Idempotency)
    const existing = await prisma.transaction.findUnique({
      where: { externalId: data.externalId },
    });

    if (existing) {
      return {
        isDuplicate: true,
        transaction: existing,
      };
    }

    // 2. Normalize merchant and categorize
    const { merchant, category } = await CategorizationService.categorize(
      data.rawMerchant,
      data.merchant,
      data.category
    );

    // 3. Save to database
    const transaction = await prisma.transaction.create({
      data: {
        externalId: data.externalId,
        cardLast4: data.cardLast4 || null,
        cardType: data.cardType || null,
        rawMerchant: data.rawMerchant,
        merchant: merchant,
        category: category,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        transactionType: data.transactionType,
        transactionDate: new Date(data.transactionDate),
        source: data.source,
        notes: data.notes || null,
      },
    });

    return {
      isDuplicate: false,
      transaction,
    };
  }

  /**
   * Batch ingests multiple transactions idempotently.
   */
  public static async batchCreateTransactions(items: CreateTransactionInput[]) {
    const results = [];
    let createdCount = 0;
    let duplicateCount = 0;

    for (const item of items) {
      const result = await this.createTransaction(item);
      results.push(result);
      if (result.isDuplicate) {
        duplicateCount++;
      } else {
        createdCount++;
      }
    }

    return {
      total: items.length,
      createdCount,
      duplicateCount,
      items: results,
    };
  }

  /**
   * Builds Prisma where clause from query parameters.
   */
  private static buildWhereClause(query: TransactionQueryInput | ExportQueryInput): Prisma.TransactionWhereInput {
    const where: Prisma.TransactionWhereInput = {};

    // Month filter (YYYY-MM)
    if (query.month) {
      const [yearStr, monthStr] = query.month.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

      where.transactionDate = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    } else if (query.startDate || query.endDate) {
      where.transactionDate = {};
      if (query.startDate) where.transactionDate.gte = new Date(query.startDate);
      if (query.endDate) where.transactionDate.lte = new Date(query.endDate);
    }

    if (query.category) {
      where.category = {
        equals: query.category,
      };
    }

    if (query.currency) {
      where.currency = query.currency.toUpperCase();
    }

    if ('cardLast4' in query && query.cardLast4) {
      where.cardLast4 = query.cardLast4;
    }

    if ('status' in query && query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { merchant: { contains: query.search } },
        { rawMerchant: { contains: query.search } },
        { notes: { contains: query.search } },
      ];
    }

    return where;
  }

  /**
   * Retrieves paginated transactions with summary statistics.
   */
  public static async getTransactions(query: TransactionQueryInput) {
    const where = this.buildWhereClause(query);
    const skip = (query.page - 1) * query.limit;

    const [total, transactions, allMatching] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: {
          [query.sortBy]: query.sortOrder,
        },
      }),
      // Fetch amounts, currencies, and categories for summary calculations
      prisma.transaction.findMany({
        where,
        select: {
          amount: true,
          currency: true,
          category: true,
        },
      }),
    ]);

    // Calculate aggregations
    let totalDOP = 0;
    let totalUSD = 0;
    const categoryTotals: Record<string, { dop: number; usd: number; count: number }> = {};

    for (const item of allMatching) {
      if (item.currency === 'USD') {
        totalUSD += item.amount;
      } else {
        totalDOP += item.amount;
      }

      if (!categoryTotals[item.category]) {
        categoryTotals[item.category] = { dop: 0, usd: 0, count: 0 };
      }
      if (item.currency === 'USD') {
        categoryTotals[item.category].usd += item.amount;
      } else {
        categoryTotals[item.category].dop += item.amount;
      }
      categoryTotals[item.category].count++;
    }

    return {
      data: transactions,
      pagination: {
        page: query.page,
        limit: query.limit,
        totalItems: total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
      summary: {
        totalTransactions: total,
        totalDOP: Math.round(totalDOP * 100) / 100,
        totalUSD: Math.round(totalUSD * 100) / 100,
        byCategory: categoryTotals,
      },
    };
  }

  /**
   * Retrieves all matching transactions for export (no pagination limit).
   */
  public static async getTransactionsForExport(query: ExportQueryInput) {
    const where = this.buildWhereClause(query);
    return prisma.transaction.findMany({
      where,
      orderBy: { transactionDate: 'desc' },
    });
  }

  /**
   * Retrieves a single transaction by ID.
   */
  public static async getTransactionById(id: string) {
    return prisma.transaction.findUnique({
      where: { id },
    });
  }

  /**
   * Updates a transaction (e.g., manual recategorization, merchant rename, or notes).
   */
  public static async updateTransaction(id: string, data: UpdateTransactionInput) {
    return prisma.transaction.update({
      where: { id },
      data: {
        ...(data.merchant && { merchant: data.merchant }),
        ...(data.category && { category: data.category }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.status && { status: data.status }),
      },
    });
  }

  /**
   * Deletes a transaction by ID.
   */
  public static async deleteTransaction(id: string) {
    return prisma.transaction.delete({
      where: { id },
    });
  }
}
