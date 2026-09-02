import { z } from 'zod';

export const categoryRuleSchema = z.object({
  id: z.string(), pattern: z.string(), normalizedMerchant: z.string().nullable(), category: z.string(), priority: z.number(),
  matchType: z.enum(['MERCHANT', 'CONTAINS']).default('CONTAINS'), targetKey: z.string().default(''),
  isActive: z.boolean().default(true), version: z.number().int().default(1),
  createdAt: z.string().optional(), updatedAt: z.string().optional(),
});
export type CategoryRuleDto = z.infer<typeof categoryRuleSchema>;
const ruleFields = z.object({
  matchType: z.enum(['MERCHANT', 'CONTAINS']).default('CONTAINS'),
  pattern: z.string().trim().max(200).default(''),
  merchantKey: z.string().min(1).max(250).optional(),
  normalizedMerchant: z.string().trim().max(60).nullable().optional(),
  category: z.string().trim().min(1, 'La categoría es requerida').max(100),
  priority: z.number().int().min(0).max(1000).default(0), isActive: z.boolean().default(true),
});
function validateTarget(value: z.infer<typeof ruleFields>, ctx: z.RefinementCtx) {
  const length = value.pattern.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().length;
  if (value.matchType === 'CONTAINS' && (length < 2 || length > 60)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['pattern'], message: 'El patrón debe tener entre 2 y 60 caracteres' });
  }
  if (value.matchType === 'MERCHANT' && !value.merchantKey) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['merchantKey'], message: 'Selecciona un comercio' });
  }
}
export const createCategoryRuleInputSchema = ruleFields.superRefine(validateTarget);
export const updateCategoryRuleInputSchema = ruleFields.partial().extend({ version: z.number().int().positive() });
export type CreateCategoryRuleInput = z.infer<typeof createCategoryRuleInputSchema>;
export type UpdateCategoryRuleInput = z.infer<typeof updateCategoryRuleInputSchema>;
export const ruleMerchantSchema = z.object({ key: z.string(), label: z.string() });
export const expenseCategorySchema = z.object({ key: z.string(), label: z.string() });
export type RuleMerchantDto = z.infer<typeof ruleMerchantSchema>;
export type ExpenseCategoryDto = z.infer<typeof expenseCategorySchema>;
