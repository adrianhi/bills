import { z } from 'zod';

const breakdownSchema = z.object({ total: z.number(), count: z.number(), percentage: z.number() });
export const financialPeriodSchema = z.object({
  startDate: z.string(), endDate: z.string(), days: z.number().int().positive(),
  totalAmount: z.number(), totalIncome: z.number(), dailyAverage: z.number(),
  transactionCount: z.number().int().nonnegative(),
});
export const financialDeltaSchema = z.object({
  name: z.string(), currentTotal: z.number(), previousTotal: z.number(),
  changeAmount: z.number(), changePercent: z.number().nullable(),
});
export const spendingInsightSchema = z.object({
  code: z.string(), tone: z.enum(['positive', 'warning', 'neutral']), title: z.string(), description: z.string(),
  metric: z.object({ value: z.number(), currency: z.string().optional(), changePercent: z.number().nullable().optional() }).optional(),
});
export type SpendingInsightDto = z.infer<typeof spendingInsightSchema>;

export const statsSummarySchema = z.object({
  period: z.string(), totalAmount: z.number(), totalIncome: z.number().optional(), totalTransactions: z.number(),
  approvedCount: z.number(), rejectedCount: z.number(), reversedCount: z.number().optional(), pendingCount: z.number().optional(),
  currency: z.string(), dailyAverage: z.number(), averageTicket: z.number().optional(),
  comparisonBasis: z.literal('EQUIVALENT_PREVIOUS_PERIOD').nullable().optional(),
  comparison: z.object({
    previousTotalAmount: z.number(), previousTotalIncome: z.number(), expenseChangePercent: z.number().nullable(),
    incomeChangePercent: z.number().nullable(), expenseChangeAmount: z.number(),
    currentPeriod: financialPeriodSchema, previousPeriod: financialPeriodSchema,
    categoryDeltas: z.array(financialDeltaSchema), merchantDeltas: z.array(financialDeltaSchema),
  }).optional(),
  insights: z.array(spendingInsightSchema).default([]),
  byCategory: z.array(breakdownSchema.extend({ category: z.string() })),
  byOrganization: z.array(breakdownSchema.extend({ organization: z.string() })).optional(),
  dailyTrend: z.array(z.object({ date: z.string(), total: z.number(), count: z.number() })),
}).passthrough();
export type StatsSummaryDto = z.infer<typeof statsSummarySchema>;
export const statsSummaryResponseSchema = z.object({ success: z.literal(true), data: statsSummarySchema });
