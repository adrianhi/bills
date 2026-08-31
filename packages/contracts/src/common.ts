import { z } from 'zod';

export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(), message: z.string(), requestId: z.string().optional(), details: z.unknown().optional(),
  }),
});
export type ApiErrorResponse = z.infer<typeof apiErrorSchema>;
export const successResponseSchema = z.object({ success: z.literal(true) }).passthrough();
