import { z } from 'zod';
import { httpClient, parseResponse } from '@/shared/api';

export const institutionSchema = z.object({
  code: z.string(), displayName: z.string(),
  status: z.enum(['PILOT', 'ACTIVE', 'COMING_SOON', 'DISABLED']),
}).passthrough();

const syncSummarySchema = z.object({
  scanned: z.number(), parsed: z.number().default(0), created: z.number(),
  ignored: z.number().optional(), failed: z.number().optional(),
});

export const inboxConnectionSchema = z.object({
  id: z.string(), email: z.string(), status: z.enum(['ACTIVE', 'REAUTH_REQUIRED', 'ERROR', 'REVOKED']),
  lastSyncedAt: z.string().nullable().optional(), lastSuccessfulSyncAt: z.string().nullable().optional(),
  nextReconcileAt: z.string().nullable().optional(), watchExpiresAt: z.string().nullable().optional(),
  lastErrorCode: z.string().nullable().optional(), failedEvents: z.number().optional(),
  lastSyncSummary: syncSummarySchema.nullable().optional(),
  currentJob: z.object({
    status: z.enum(['PENDING', 'PROCESSING', 'FAILED', 'SUCCEEDED']),
    errorCode: z.string().nullable().optional(),
  }).nullable().optional(),
}).passthrough();

export const bankConnectionSchema = z.object({
  id: z.string(), institution: institutionSchema,
  ingestionAddress: z.object({ aliasToken: z.string(), domain: z.string() }).nullable().optional(),
}).passthrough();

const list = <T extends z.ZodTypeAny>(item: T) => z.object({ success: z.literal(true), data: z.array(item) });

export type Institution = z.infer<typeof institutionSchema>;
export type InboxConnection = z.infer<typeof inboxConnectionSchema>;
export type BankConnection = z.infer<typeof bankConnectionSchema>;

export const connectionService = {
  async listInstitutions(signal?: AbortSignal) {
    const response = await httpClient.get('/financial-institutions', { signal });
    return parseResponse(list(institutionSchema), response.data).data;
  },
  async listBankConnections(signal?: AbortSignal) {
    const response = await httpClient.get('/bank-connections', { signal });
    return parseResponse(list(bankConnectionSchema), response.data).data;
  },
  async listInboxConnections(signal?: AbortSignal) {
    const response = await httpClient.get('/inbox-connections', { signal });
    return parseResponse(list(inboxConnectionSchema), response.data).data;
  },
  async startGoogle(returnTo: string) {
    const response = await httpClient.post('/inbox-connections/google/start', { returnTo });
    return z.object({ data: z.object({ authorizationUrl: z.string().url() }) }).parse(response.data).data;
  },
  async sync(id: string) { await httpClient.post(`/inbox-connections/${id}/sync`); },
  async disconnect(id: string) { await httpClient.delete(`/inbox-connections/${id}`); },
  async createBankConnection(institutionCode: string) {
    const response = await httpClient.post('/bank-connections', { institutionCode });
    return parseResponse(bankConnectionSchema, response.data?.data);
  },
};
