import { z } from 'zod';

export const categoryRuleSchema = z.object({
  id: z.string(), pattern: z.string(), normalizedMerchant: z.string(), category: z.string(), priority: z.number(),
});
export type CategoryRuleDto = z.infer<typeof categoryRuleSchema>;
export const createCategoryRuleInputSchema = z.object({
  pattern: z.string().trim().min(2, 'El patrón debe tener al menos 2 caracteres').max(60, 'El patrón no puede superar 60 caracteres').transform((value) => value.toUpperCase()),
  normalizedMerchant: z.string().trim().min(1, 'El nombre limpio es requerido').max(60, 'El nombre limpio no puede superar 60 caracteres'),
  category: z.string().trim().min(1, 'La categoría es requerida').max(60, 'La categoría no puede superar 60 caracteres'),
  priority: z.number().int().min(0).max(1000).default(0), isActive: z.boolean().default(true),
});
export type CreateCategoryRuleInput = z.infer<typeof createCategoryRuleInputSchema>;
