import { z } from 'zod';
import {
  createTransactionInputSchema,
  batchCreateTransactionsInputSchema,
  updateTransactionInputSchema,
  createCategoryRuleInputSchema,
  transactionStatusSchema,
} from '@bills/contracts';

export const CreateTransactionSchema = createTransactionInputSchema;
export const BatchCreateTransactionsSchema = batchCreateTransactionsInputSchema;
export const UpdateTransactionSchema = updateTransactionInputSchema;

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
  institutionCode: z.string().optional().transform((val) => val?.toUpperCase()),
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
  institutionCode: z.string().optional().transform((val) => val?.toUpperCase()),
  search: z.string().optional(),
});

export const CreateCategoryRuleSchema = createCategoryRuleInputSchema;

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
export type BatchCreateTransactionsInput = z.infer<typeof BatchCreateTransactionsSchema>;
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;
export type TransactionQueryInput = z.infer<typeof TransactionQuerySchema>;
export type ExportQueryInput = z.infer<typeof ExportQuerySchema>;
export type CreateCategoryRuleInput = z.infer<typeof CreateCategoryRuleSchema>;
