import { z } from 'zod';

export const PRODUCT_GUIDE_VERSION = '2026-08-30.2';
export const productGuideStateSchema = z.object({
  currentVersion: z.string(), versionSeen: z.string().nullable(),
  completedAt: z.string().datetime().nullable(), completed: z.boolean(),
});
export type ProductGuideState = z.infer<typeof productGuideStateSchema>;
export const bootstrapResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    onboardingComplete: z.boolean(), legalAcceptanceRequired: z.boolean(), productGuide: productGuideStateSchema,
  }).passthrough(),
});
export type BootstrapResponse = z.infer<typeof bootstrapResponseSchema>;
