import { z } from 'zod';
import { httpClient, parseResponse } from '@/shared/api';

export const legalDocumentSchema = z.object({
  type: z.enum(['TERMS', 'PRIVACY', 'GOOGLE_API_DISCLOSURE', 'DATA_DELETION']),
  version: z.string(),
  title: z.string(),
  slug: z.string(),
  effectiveAt: z.string(),
  content: z.string(),
  required: z.boolean(),
  accepted: z.boolean(),
});
export type LegalDocument = z.infer<typeof legalDocumentSchema>;

const legalListSchema = z.object({ success: z.literal(true), data: z.array(legalDocumentSchema) });

export const legalService = {
  async listPublic(signal?: AbortSignal) {
    const response = await httpClient.get('/legal/current', { signal });
    return parseResponse(legalListSchema, response.data).data;
  },
  async listForUser(signal?: AbortSignal) {
    const response = await httpClient.get('/legal/me/current', { signal });
    return parseResponse(legalListSchema, response.data).data;
  },
  async accept(documents: LegalDocument[]) {
    await httpClient.post('/legal/accept', {
      documents: documents.map(({ type, version }) => ({ type, version })),
      source: documents.some((item) => item.accepted) ? 'RECONSENT' : 'SIGNUP',
      locale: 'es-DO',
    });
  },
};
