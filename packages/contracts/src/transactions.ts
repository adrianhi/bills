import { z } from 'zod';

export const transactionStatusSchema = z.enum(['PENDING', 'APPROVED', 'DECLINED', 'REVERSED']);
export type TransactionStatusCode = z.infer<typeof transactionStatusSchema>;

export const transactionSchema = z.object({
  id: z.string(), externalId: z.string(), cardLast4: z.string().nullable(), cardType: z.string().nullable(),
  rawMerchant: z.string(), merchant: z.string(), amount: z.coerce.number(), currency: z.string(),
  status: z.string(), statusCode: transactionStatusSchema, transactionType: z.string(), category: z.string(),
  notes: z.string().nullable().optional(), source: z.string().optional(), institutionCode: z.string().optional(),
  ingestionChannel: z.string().optional(), transactionDate: z.string(), createdAt: z.string(),
});
export type TransactionDto = z.infer<typeof transactionSchema>;

export const transactionFiltersSchema = z.object({
  page: z.number().int().positive().default(1), limit: z.number().int().positive().max(100).default(20),
  currency: z.string().default('DOP'), month: z.string().optional(), startDate: z.string().optional(),
  endDate: z.string().optional(), search: z.string().optional(), category: z.string().optional(),
  status: z.string().optional(), organization: z.string().optional(), transactionType: z.string().optional(),
});
export type TransactionFilters = z.infer<typeof transactionFiltersSchema>;

export const paginationSchema = z.object({
  page: z.number(), limit: z.number(), total: z.number().optional(),
  totalItems: z.number().optional(), totalPages: z.number(),
});

export const transactionListResponseSchema = z.object({
  success: z.literal(true), data: z.array(transactionSchema), pagination: paginationSchema,
});
export type TransactionListResponse = z.infer<typeof transactionListResponseSchema>;

export const createTransactionInputSchema = z.object({
  externalId: z.string().trim().min(1, 'El identificador externo es requerido').max(200),
  cardLast4: z.string().trim().max(10).optional().nullable(), cardType: z.string().trim().max(100).optional().nullable(),
  rawMerchant: z.string().trim().min(1, 'El nombre del comercio o emisor es requerido').max(200),
  merchant: z.string().trim().max(200).optional().nullable(), category: z.string().trim().max(100).optional().nullable(),
  amount: z.coerce.number({ invalid_type_error: 'El monto debe ser numérico' }).positive('El monto debe ser mayor a 0').max(100_000_000, 'El monto excede el límite permitido'),
  currency: z.string().trim().min(3).max(3).default('DOP').transform((value) => value.toUpperCase()),
  status: z.string().trim().default('Aprobada'), statusCode: transactionStatusSchema.optional(),
  bankReference: z.string().trim().max(180).optional().nullable(), transactionType: z.string().trim().default('Compra'),
  transactionDate: z.coerce.date({ invalid_type_error: 'Fecha de transacción inválida' }),
  source: z.string().trim().default('MANUAL'),
  institutionCode: z.string().trim().min(2).max(32).optional().transform((value) => value?.toUpperCase()),
  ingestionChannel: z.enum(['MANUAL', 'CSV_IMPORT', 'GMAIL_OAUTH']).default('MANUAL'),
  notes: z.string().trim().max(500, 'Las notas no pueden superar 500 caracteres').optional().nullable(),
});
export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

export const batchCreateTransactionsInputSchema = z.object({
  transactions: z.array(createTransactionInputSchema).min(1, 'Al menos una transacción es requerida'),
});
export type BatchCreateTransactionsInput = z.infer<typeof batchCreateTransactionsInputSchema>;

export const updateTransactionInputSchema = z.object({
  merchant: z.string().trim().min(1, 'El comercio no puede estar vacío').max(200).optional(),
  category: z.string().trim().min(1, 'La categoría no puede estar vacía').max(100).optional(),
  notes: z.string().trim().max(500, 'Las notas no pueden superar 500 caracteres').optional().nullable(),
  status: z.string().trim().max(50).optional(), statusCode: transactionStatusSchema.optional(),
});
export type UpdateTransactionInput = z.infer<typeof updateTransactionInputSchema>;
