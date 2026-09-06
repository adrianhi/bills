import { z } from 'zod';
import { budgetCurrencySchema } from './budgets';

export const productViewNameSchema = z.enum([
  'SAFE_TO_SPEND_VIEWED', 'RECURRING_RADAR_VIEWED', 'PAYDAY_RITUAL_VIEWED',
]);
export const recordProductViewSchema = z.object({
  name: productViewNameSchema,
  contextKey: z.string().regex(/^[a-zA-Z0-9:_-]{1,80}$/),
  properties: z.object({
    currency: budgetCurrencySchema.optional(),
    status: z.string().max(32).optional(),
  }).strict().optional(),
});
export type RecordProductViewInput = z.infer<typeof recordProductViewSchema>;
