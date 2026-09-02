import { z } from 'zod';

export const COMMON_EXPENSE_CATEGORIES = [
  'Supermercado', 'Restaurantes & Delivery', 'Servicios Financieros', 'Transferencias',
  'Transporte', 'Combustible', 'Servicios', 'Suscripciones', 'Salud & Farmacia',
  'Compras Online', 'Hogar', 'Ropa & Moda', 'Entretenimiento', 'Tecnología', 'Otros',
] as const;

export const budgetCurrencySchema = z.enum(['DOP', 'USD']);
export const budgetMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const budgetStatusSchema = z.enum(['ON_TRACK', 'PACE_WARNING', 'NEAR_LIMIT', 'EXCEEDED']);
export const budgetPropagationSchema = z.enum(['CURRENT_MONTH', 'CURRENT_AND_FUTURE']);

export const budgetCategorySchema = z.object({
  key: z.string().min(1).max(120),
  label: z.string().min(1).max(100),
});
export type BudgetCategoryDto = z.infer<typeof budgetCategorySchema>;

export const budgetProgressSchema = z.object({
  scope: z.enum(['GLOBAL', 'CATEGORY']),
  categoryKey: z.string().nullable(),
  categoryLabel: z.string().nullable(),
  limit: z.number().positive(),
  spent: z.number().nonnegative(),
  pending: z.number().nonnegative(),
  remaining: z.number().nonnegative(),
  exceededBy: z.number().nonnegative(),
  percentUsed: z.number().nonnegative(),
  projected: z.number().nonnegative().nullable(),
  status: budgetStatusSchema,
});
export type BudgetProgressDto = z.infer<typeof budgetProgressSchema>;

export const budgetSummarySchema = z.object({
  month: budgetMonthSchema,
  currency: budgetCurrencySchema,
  hasBudget: z.boolean(),
  propagation: budgetPropagationSchema.default('CURRENT_AND_FUTURE'),
  totalSpent: z.number().nonnegative(),
  totalPending: z.number().nonnegative(),
  unbudgetedSpent: z.number().nonnegative(),
  global: budgetProgressSchema.nullable(),
  categories: z.array(budgetProgressSchema),
  alerts: z.array(budgetProgressSchema).max(3),
});
export type BudgetSummaryDto = z.infer<typeof budgetSummarySchema>;

export const budgetSuggestionSchema = z.object({
  month: budgetMonthSchema,
  currency: budgetCurrencySchema,
  monthsUsed: z.array(budgetMonthSchema).max(6),
  coverage: z.number().int().min(0).max(6),
  globalLimit: z.number().positive().nullable(),
  categories: z.array(z.object({
    categoryKey: z.string(), categoryLabel: z.string(), amount: z.number().positive(), activeMonths: z.number().int().min(2),
  })),
});
export type BudgetSuggestionDto = z.infer<typeof budgetSuggestionSchema>;

const budgetAmountSchema = z.coerce.number().finite().positive().max(999_999_999.99);
export const replaceMonthlyBudgetSchema = z.object({
  month: budgetMonthSchema,
  currency: budgetCurrencySchema,
  propagation: budgetPropagationSchema,
  globalLimit: budgetAmountSchema.nullable(),
  categories: z.array(z.object({
    categoryKey: z.string().trim().min(1).max(120),
    amount: budgetAmountSchema,
  })).max(100),
}).superRefine((value, context) => {
  const keys = value.categories.map((item) => item.categoryKey);
  if (new Set(keys).size !== keys.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['categories'], message: 'Las categorías no pueden repetirse.' });
  }
});
export type ReplaceMonthlyBudgetInput = z.infer<typeof replaceMonthlyBudgetSchema>;

export const budgetSummaryResponseSchema = z.object({ success: z.literal(true), data: budgetSummarySchema });
export const budgetSuggestionResponseSchema = z.object({ success: z.literal(true), data: budgetSuggestionSchema });
export const budgetCategoriesResponseSchema = z.object({ success: z.literal(true), data: z.array(budgetCategorySchema) });
