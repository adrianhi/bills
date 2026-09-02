import type { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import { normalizeTransactionStatus } from '../../../domain/transaction-status';
import type { ExportQueryInput, TransactionQueryInput } from '../../../schemas/transaction.schema';
import type { TransactionReader } from '../application/transaction-store.port';
import { isIncomeMovement, resolveDateRange } from '../domain/transaction-policy';
import { visibleTransactionWhere } from './income-visibility.where';

type Query = TransactionQueryInput | ExportQueryInput;

function institutionCode(value: string): string {
  const normalized = value.toUpperCase();
  if (normalized === 'BANCO BHD') return 'BHD';
  if (normalized === 'BANCO POPULAR') return 'POPULAR';
  return normalized;
}

function movementTypeFilter(value: string): Prisma.TransactionWhereInput {
  const type = value.toLowerCase();
  if (type === 'enviada' || type.includes('enviada')) {
    return { transactionType: { contains: 'Transferencia' } };
  }
  if (type === 'compra') return { transactionType: { contains: 'Compra' } };
  if (type === 'servicio') {
    return {
      OR: [
        { transactionType: { contains: 'Servicio' } },
        { category: 'Servicios' },
        { source: 'BHD_SERVICE_PAYMENT' },
      ],
    };
  }
  if (type === 'retiro') return { transactionType: { contains: 'Retiro' } };
  return { transactionType: value };
}

export function buildTransactionWhere(workspaceId: string, query: Query): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = { workspaceId, ...visibleTransactionWhere() };
  const dateRange = resolveDateRange(query.month, query.startDate, query.endDate);
  if (dateRange.gte || dateRange.lte) where.transactionDate = dateRange;
  if (query.category) where.category = { equals: query.category };
  if (query.currency) where.currency = query.currency.toUpperCase();
  if ('cardLast4' in query && query.cardLast4) where.cardLast4 = query.cardLast4;
  if (query.status) where.statusCode = normalizeTransactionStatus(query.status);

  const organization = query.institutionCode || query.organization || query.source;
  const institutionCodes = 'institutionCodes' in query ? query.institutionCodes : undefined;
  if (institutionCodes?.length) {
    where.institutionCode = { in: institutionCodes.map(institutionCode) };
  } else if (organization && organization.toUpperCase() !== 'ALL') {
    where.institutionCode = institutionCode(organization);
  }
  if (query.transactionType) Object.assign(where, movementTypeFilter(query.transactionType));
  if (query.search) {
    const search = [
      { merchant: { contains: query.search } },
      { rawMerchant: { contains: query.search } },
      { notes: { contains: query.search } },
    ];
    if (where.OR) {
      where.AND = [{ OR: where.OR }, { OR: search }];
      delete where.OR;
    } else {
      where.OR = search;
    }
  }
  return where;
}

export class PrismaTransactionQuery implements TransactionReader {
  public async list(workspaceId: string, query: TransactionQueryInput) {
    const where = buildTransactionWhere(workspaceId, query);
    const [total, transactions, matching] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
      }),
      prisma.transaction.findMany({
        where,
        select: {
          amount: true, currency: true, category: true,
          statusCode: true, transactionType: true, source: true,
        },
      }),
    ]);
    let totalDOP = 0;
    let totalUSD = 0;
    const byCategory: Record<string, { dop: number; usd: number; count: number }> = {};
    for (const item of matching) {
      if (item.statusCode !== 'APPROVED' || isIncomeMovement(item)) continue;
      const amount = Number(item.amount);
      if (item.currency === 'USD') totalUSD += amount;
      else totalDOP += amount;
      byCategory[item.category] ??= { dop: 0, usd: 0, count: 0 };
      if (item.currency === 'USD') byCategory[item.category].usd += amount;
      else byCategory[item.category].dop += amount;
      byCategory[item.category].count += 1;
    }
    return {
      data: transactions,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalItems: total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
      summary: {
        totalTransactions: total,
        totalDOP: Math.round(totalDOP * 100) / 100,
        totalUSD: Math.round(totalUSD * 100) / 100,
        byCategory,
      },
    };
  }

  public export(workspaceId: string, query: ExportQueryInput, limit?: number) {
    return prisma.transaction.findMany({
      where: buildTransactionWhere(workspaceId, query),
      orderBy: { transactionDate: 'desc' },
      ...(limit ? { take: limit } : {}),
    });
  }

  public get(workspaceId: string, id: string) {
    return prisma.transaction.findFirst({ where: { id, workspaceId, ...visibleTransactionWhere() } });
  }
}
