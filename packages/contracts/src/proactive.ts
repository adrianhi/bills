import { z } from 'zod';
import { budgetCurrencySchema } from './budgets';

export const proactiveActionKindSchema = z.enum([
  'IMMINENT_BILL',
  'BUDGET_PACING_RISK',
  'UNCLASSIFIED_EXPENSES',
  'PRICE_HIKE',
  'SAVING_STREAK',
  'WEEKLY_CHECKIN',
]);
export type ProactiveActionKind = z.infer<typeof proactiveActionKindSchema>;

export const proactiveActionPrioritySchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);
export type ProactiveActionPriority = z.infer<typeof proactiveActionPrioritySchema>;

export const proactiveActionSchema = z.object({
  id: z.string(),
  kind: proactiveActionKindSchema,
  priority: proactiveActionPrioritySchema,
  title: z.string(),
  description: z.string(),
  ctaLabel: z.string(),
  actionType: z.string(),
  dismissible: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().optional(),
});
export type ProactiveActionDto = z.infer<typeof proactiveActionSchema>;

export const proactiveFeedSchema = z.object({
  currency: budgetCurrencySchema,
  generatedAt: z.string(),
  actions: z.array(proactiveActionSchema),
  counts: z.object({
    total: z.number().int().nonnegative(),
    imminentBills: z.number().int().nonnegative(),
    pacingRisks: z.number().int().nonnegative(),
    unclassified: z.number().int().nonnegative(),
  }),
});
export type ProactiveFeedDto = z.infer<typeof proactiveFeedSchema>;

export const proactiveFeedResponseSchema = z.object({
  success: z.literal(true),
  data: proactiveFeedSchema,
});
export type ProactiveFeedResponse = z.infer<typeof proactiveFeedResponseSchema>;

export const dismissProactiveActionSchema = z.object({
  actionId: z.string().min(1).max(120),
});
export type DismissProactiveActionInput = z.infer<typeof dismissProactiveActionSchema>;

export const weeklyCheckinCategorySchema = z.object({
  name: z.string(),
  amount: z.number().nonnegative(),
  percentage: z.number().min(0).max(100),
});
export type WeeklyCheckinCategoryDto = z.infer<typeof weeklyCheckinCategorySchema>;

export const weeklyCheckinMerchantSchema = z.object({
  name: z.string(),
  amount: z.number().nonnegative(),
});
export type WeeklyCheckinMerchantDto = z.infer<typeof weeklyCheckinMerchantSchema>;

export const weeklyCheckinSchema = z.object({
  weekKey: z.string(),
  currency: budgetCurrencySchema,
  startDate: z.string(),
  endDate: z.string(),
  totalSpentThisWeek: z.number().nonnegative(),
  totalSpentPreviousWeek: z.number().nonnegative(),
  changePercent: z.number().nullable(),
  netDifference: z.number(),
  topCategory: weeklyCheckinCategorySchema.nullable(),
  topMerchant: weeklyCheckinMerchantSchema.nullable(),
  daysToNextPayday: z.number().int().nonnegative(),
  estimatedDailyAllowance: z.number().nonnegative(),
  status: z.enum(['OPEN', 'COMPLETED']),
  completedAt: z.string().nullable(),
});
export type WeeklyCheckinDto = z.infer<typeof weeklyCheckinSchema>;

export const weeklyCheckinResponseSchema = z.object({
  success: z.literal(true),
  data: weeklyCheckinSchema,
});
export type WeeklyCheckinResponse = z.infer<typeof weeklyCheckinResponseSchema>;

export const completeWeeklyCheckinSchema = z.object({
  weekKey: z.string().min(1).max(80),
});
export type CompleteWeeklyCheckinInput = z.infer<typeof completeWeeklyCheckinSchema>;
