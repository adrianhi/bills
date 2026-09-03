import { z } from 'zod';

export const incomeFrequencySchema = z.enum(['WEEKLY', 'BIWEEKLY_15_30', 'MONTHLY', 'CUSTOM']);
export type IncomeFrequency = z.infer<typeof incomeFrequencySchema>;

export const incomeStreamSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.coerce.number(),
  currency: z.string(),
  frequency: incomeFrequencySchema,
  dayOfMonth: z.number().nullable().optional(),
  isActive: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type IncomeStreamDto = z.infer<typeof incomeStreamSchema>;

export const createIncomeStreamSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido').max(100),
  amount: z.coerce.number({ invalid_type_error: 'Monto inválido' }).positive('El monto debe ser mayor a 0'),
  currency: z.string().trim().min(3).max(3).default('DOP').transform((v) => v.toUpperCase()),
  frequency: incomeFrequencySchema.default('BIWEEKLY_15_30'),
  dayOfMonth: z.coerce.number().min(1).max(31).optional().nullable(),
});
export type CreateIncomeStreamInput = z.infer<typeof createIncomeStreamSchema>;

export const updateIncomeStreamSchema = createIncomeStreamSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateIncomeStreamInput = z.infer<typeof updateIncomeStreamSchema>;

export const cashFlowSummarySchema = z.object({
  month: z.string(),
  currency: z.string(),
  detectedIncome: z.number(),
  projectedIncome: z.number(),
  totalIncome: z.number(),
  totalSpent: z.number(),
  netSavings: z.number(),
  savingsRate: z.number(),
  streamsCount: z.number(),
});
export type CashFlowSummaryDto = z.infer<typeof cashFlowSummarySchema>;
