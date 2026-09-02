import { z } from 'zod';

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'Fecha inválida');
export const previewRuleApplicationSchema = z.object({
  includeUnknown: z.boolean().default(false), startDate: day.optional(), endDate: day.optional(),
}).refine((value) => !value.startDate || !value.endDate || value.startDate <= value.endDate, 'Período inválido');
export type PreviewRuleApplicationInput = z.infer<typeof previewRuleApplicationSchema>;

export const ruleApplicationSampleSchema = z.object({
  transactionId: z.string(), merchant: z.string(), category: z.string(),
  nextMerchant: z.string(), nextCategory: z.string(), reason: z.string(),
});
export const ruleApplicationSchema = z.object({
  id: z.string(), ruleId: z.string(), phase: z.enum(['PREVIEW', 'APPLY']),
  ruleLabel: z.string().default(''), ruleCategory: z.string().default(''),
  startDate: z.string().nullable().default(null), endDate: z.string().nullable().default(null),
  status: z.enum(['QUEUED', 'PROCESSING', 'READY', 'COMPLETED', 'FAILED', 'STALE']),
  includeUnknown: z.boolean(), scanned: z.number(), matched: z.number(), changes: z.number(),
  categoryChanges: z.number(), merchantChanges: z.number(), protectedManual: z.number(),
  protectedUnknown: z.number(), otherRule: z.number(), applied: z.number(), skipped: z.number(),
  errorCode: z.string().nullable(), createdAt: z.string(),
  sample: z.array(ruleApplicationSampleSchema),
});
export type RuleApplicationDto = z.infer<typeof ruleApplicationSchema>;
