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

// --- Expense Simulator ('¿Puedo darme este gusto?') ---
export const simulateExpenseInputSchema = z.object({
  amount: z.number().positive(),
  categoryKey: z.string().max(80).optional(),
  currency: budgetCurrencySchema.default('DOP'),
});
export type SimulateExpenseInput = z.infer<typeof simulateExpenseInputSchema>;

export const simulateExpenseCategoryImpactSchema = z.object({
  categoryKey: z.string(),
  categoryLabel: z.string(),
  currentSpent: z.number().nonnegative(),
  projectedSpent: z.number().nonnegative(),
  limit: z.number().nonnegative(),
  currentPercent: z.number().nonnegative(),
  projectedPercent: z.number().nonnegative(),
  status: z.enum(['HEALTHY', 'PACE_WARNING', 'EXCEEDED']),
});
export type SimulateExpenseCategoryImpactDto = z.infer<typeof simulateExpenseCategoryImpactSchema>;

export const simulateExpenseResultSchema = z.object({
  currency: budgetCurrencySchema,
  simulatedAmount: z.number().positive(),
  verdict: z.enum(['SAFE', 'TIGHT', 'OVERSPEND']),
  currentDailyAllowance: z.number().nonnegative(),
  projectedDailyAllowance: z.number().nonnegative(),
  allowanceDifference: z.number(),
  daysRemaining: z.number().int().nonnegative(),
  categoryImpact: simulateExpenseCategoryImpactSchema.nullable(),
  adviceTitle: z.string(),
  adviceDescription: z.string(),
});
export type SimulateExpenseResultDto = z.infer<typeof simulateExpenseResultSchema>;

export const simulateExpenseResponseSchema = z.object({
  success: z.literal(true),
  data: simulateExpenseResultSchema,
});
export type SimulateExpenseResponse = z.infer<typeof simulateExpenseResponseSchema>;

// --- Weekly Email Digest ---
export const weeklyDigestPreviewSchema = z.object({
  subject: z.string(),
  recipient: z.string(),
  weekKey: z.string(),
  html: z.string(),
  generatedAt: z.string(),
});
export type WeeklyDigestPreviewDto = z.infer<typeof weeklyDigestPreviewSchema>;

export const weeklyDigestPreviewResponseSchema = z.object({
  success: z.literal(true),
  data: weeklyDigestPreviewSchema,
});
export type WeeklyDigestPreviewResponse = z.infer<typeof weeklyDigestPreviewResponseSchema>;

export const sendWeeklyDigestTestSchema = z.object({
  recipientEmail: z.string().email().optional(),
  currency: budgetCurrencySchema.default('DOP'),
});
export type SendWeeklyDigestTestInput = z.infer<typeof sendWeeklyDigestTestSchema>;

export const sendWeeklyDigestTestResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    delivered: z.boolean(),
    recipient: z.string(),
    subject: z.string(),
    mode: z.enum(['SMTP', 'AUDIT_LOG']),
  }),
});
export type SendWeeklyDigestTestResponse = z.infer<typeof sendWeeklyDigestTestResponseSchema>;

