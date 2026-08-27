import type { z } from 'zod';
import { ApiClientError } from './api-error';

export function parseResponse<TSchema extends z.ZodTypeAny>(schema: TSchema, value: unknown): z.infer<TSchema> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new ApiClientError('El servidor devolvió una respuesta incompatible.', 'INVALID_API_RESPONSE', undefined, undefined, parsed.error.flatten());
  }
  return parsed.data;
}
