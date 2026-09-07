import { z } from 'zod';
import { budgetCurrencySchema } from './budgets';

export const recurringCadenceSchema = z.enum(['BIWEEKLY', 'MONTHLY', 'ANNUAL']);
export const recurringStatusSchema = z.enum(['SUGGESTED', 'CONFIRMED', 'PAUSED', 'DISMISSED']);
export const recurringAlertKindSchema = z.enum(['PRICE_HIKE', 'MISSED_EXPECTED_CHARGE']);
export const recurringAnalysisStatusSchema = z.enum(['PENDING', 'PROCESSING', 'READY', 'FAILED']);
export const recurringMonthStatusSchema = z.enum(['PAID', 'UPCOMING', 'OVERDUE']);
export type RecurringMonthStatus = z.infer<typeof recurringMonthStatusSchema>;

export const recurringAlertSchema = z.object({
  id: z.string(),
  kind: recurringAlertKindSchema,
  baselineAmount: z.number().nonnegative().nullable(),
  observedAmount: z.number().nonnegative().nullable(),
  createdAt: z.string(),
});
export type RecurringAlertDto = z.infer<typeof recurringAlertSchema>;

export const recurringBillSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  currency: budgetCurrencySchema,
  cadence: recurringCadenceSchema,
  expectedAmount: z.number().positive(),
  nextExpectedDate: z.string(),
  lastSeenAt: z.string(),
  occurrenceCount: z.number().int().min(1),
  confidence: z.number().min(0).max(1),
  status: recurringStatusSchema,
  userEdited: z.boolean(),
  daysRemaining: z.number().int(),
  monthStatus: recurringMonthStatusSchema.default('UPCOMING'),
  lastPaidAmount: z.number().nullable().optional(),
  lastPaidDate: z.string().nullable().optional(),
  alerts: z.array(recurringAlertSchema),
});
export type RecurringBillDto = z.infer<typeof recurringBillSchema>;

export const recurringRadarSchema = z.object({
  currency: budgetCurrencySchema,
  generatedAt: z.string(),
  analysisStatus: recurringAnalysisStatusSchema,
  fixedMonthlyBurden: z.number().nonnegative(),
  paidThisMonth: z.number().nonnegative().default(0),
  pendingThisMonth: z.number().nonnegative().default(0),
  estimatedMonthlyIncome: z.number().nonnegative().default(0),
  freeDiscretionaryCash: z.number().default(0),
  upcoming: z.array(recurringBillSchema),
  allConfirmed: z.array(recurringBillSchema).default([]),
  upcomingWindows: z.object({ in7: z.number().int().nonnegative(), in14: z.number().int().nonnegative(), in30: z.number().int().nonnegative() }),
  suggestions: z.array(recurringBillSchema),
  attention: z.array(recurringBillSchema),
  paused: z.array(recurringBillSchema),
});
export type RecurringRadarDto = z.infer<typeof recurringRadarSchema>;

export const createRecurringBillSchema = z.object({
  displayName: z.string().trim().min(1, 'El nombre es requerido').max(100),
  expectedAmount: z.coerce.number({ invalid_type_error: 'Monto inválido' }).positive('El monto debe ser mayor a 0').max(999_999_999.99),
  currency: budgetCurrencySchema.default('DOP'),
  cadence: recurringCadenceSchema.default('MONTHLY'),
  nextExpectedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
});
export type CreateRecurringBillInput = z.infer<typeof createRecurringBillSchema>;

export const updateRecurringBillSchema = z.object({
  displayName: z.string().trim().min(1).max(100).optional(),
  cadence: recurringCadenceSchema.optional(),
  expectedAmount: z.coerce.number().positive().max(999_999_999.99).optional(),
  nextExpectedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: recurringStatusSchema.optional(),
}).refine((value) => Object.keys(value).length > 0, 'Indica al menos un cambio.');
export type UpdateRecurringBillInput = z.infer<typeof updateRecurringBillSchema>;

export const acknowledgeRecurringAlertSchema = z.object({ acknowledged: z.literal(true) });
export const recurringRadarResponseSchema = z.object({ success: z.literal(true), data: recurringRadarSchema });
export const recurringBillResponseSchema = z.object({ success: z.literal(true), data: recurringBillSchema });
