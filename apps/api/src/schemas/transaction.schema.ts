import { z } from 'zod';

export const CreateTransactionSchema = z.object({
  externalId: z.string().min(1, 'externalId is required'),
  cardLast4: z.string().max(10).optional().nullable(),
  cardType: z.string().max(100).optional().nullable(),
  rawMerchant: z.string().min(1, 'rawMerchant is required'),
  merchant: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  amount: z.coerce.number().positive('amount must be a positive number'),
  currency: z.string().default('DOP').transform((val) => val.toUpperCase()),
  status: z.string().default('Aprobada'),
  transactionType: z.string().default('Compra'),
  transactionDate: z.coerce.date(),
  source: z.string().default('BHD_EMAIL'),
  notes: z.string().optional().nullable(),
});

export const BatchCreateTransactionsSchema = z.object({
  transactions: z.array(CreateTransactionSchema).min(1, 'At least one transaction required'),
});

export const UpdateTransactionSchema = z.object({
  merchant: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  notes: z.string().optional().nullable(),
  status: z.string().optional(),
});

export const TransactionQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format')
    .optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  category: z.string().optional(),
  currency: z.string().optional().transform((val) => val?.toUpperCase()),
  cardLast4: z.string().optional(),
  status: z.string().optional(),
  transactionType: z.string().optional(),
  source: z.string().optional(),
  organization: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(50),
  sortBy: z.enum(['transactionDate', 'amount', 'createdAt', 'merchant', 'category']).default('transactionDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const ExportQuerySchema = z.object({
  format: z.enum(['csv', 'json']).default('csv'),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format')
    .optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  category: z.string().optional(),
  currency: z.string().optional().transform((val) => val?.toUpperCase()),
  status: z.string().optional(),
  transactionType: z.string().optional(),
  source: z.string().optional(),
  organization: z.string().optional(),
  search: z.string().optional(),
});

export const CreateCategoryRuleSchema = z.object({
  pattern: z.string().min(1, 'Pattern is required'),
  normalizedMerchant: z.string().min(1, 'Normalized merchant name is required'),
  category: z.string().min(1, 'Category is required'),
  priority: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
export type BatchCreateTransactionsInput = z.infer<typeof BatchCreateTransactionsSchema>;
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;
export type TransactionQueryInput = z.infer<typeof TransactionQuerySchema>;
export type ExportQueryInput = z.infer<typeof ExportQuerySchema>;
export type CreateCategoryRuleInput = z.infer<typeof CreateCategoryRuleSchema>;
