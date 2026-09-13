import { z } from 'zod';

export const betaInterestInputSchema = z.object({
  email: z.string().trim().email('Ingresa un correo electrónico válido').max(255),
  source: z.string().trim().max(100).optional().default('LANDING_DIRECT'),
  campaignCode: z.string().trim().max(100).optional(),
  referredBy: z.string().trim().max(100).optional(),
});

export type BetaInterestInput = z.infer<typeof betaInterestInputSchema>;

export const betaInterestResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  alreadyRegistered: z.boolean().optional(),
});

export type BetaInterestResponse = z.infer<typeof betaInterestResponseSchema>;
