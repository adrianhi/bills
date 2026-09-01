import { z } from 'zod';
import {
  budgetMonthSchema,
  createTransactionInputSchema,
  batchCreateTransactionsInputSchema,
  updateTransactionInputSchema,
  createCategoryRuleInputSchema,
  transactionStatusSchema,
} from '@bills/contracts';

export const REPORT_SECTIONS = ['summary', 'comparison', 'categories', 'merchants', 'movements', 'budget'] as const;
const DEFAULT_REPORT_SECTIONS = ['summary', 'comparison', 'categories', 'merchants', 'movements'] as const;

const commaSeparatedInstitutionCodes = z.preprocess((input) => {
  if (input === undefined || input === '') return undefined;
  const values = Array.isArray(input) ? input : String(input).split(',');
  return [...new Set(values.map((value) => String(value).trim().toUpperCase()).filter(Boolean))];
}, z.array(z.string().regex(/^[A-Z0-9_]{2,32}$/)).max(10).optional());

const commaSeparatedReportSections = z.preprocess((input) => {
  if (input === undefined || input === '') return [...DEFAULT_REPORT_SECTIONS];
  const values = Array.isArray(input) ? input : String(input).split(',');
  return [...new Set(values.map((value) => String(value).trim().toLowerCase()).filter(Boolean))];
}, z.array(z.enum(REPORT_SECTIONS)).min(1));

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
  institutionCodes: commaSeparatedInstitutionCodes,
  search: z.string().optional(),
});

export const FinancialReportQuerySchema = ExportQuerySchema.omit({ format: true }).extend({
  format: z.enum(['csv', 'xlsx', 'pdf']),
  includeNotes: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  title: z.string().trim().min(1).max(100).optional(),
  sections: commaSeparatedReportSections,
}).superRefine((value, context) => {
  if (!value.sections.includes('budget')) return;
  const extraFilters = value.category || value.status || value.transactionType || value.search || value.source
    || value.organization || value.institutionCode || value.institutionCodes?.length;
  if (value.format === 'csv') context.addIssue({ code: z.ZodIssueCode.custom, path: ['sections'], message: 'Presupuesto solo está disponible en PDF y XLSX.' });
  if (!value.month || value.startDate || value.endDate) context.addIssue({ code: z.ZodIssueCode.custom, path: ['month'], message: 'Presupuesto requiere un mes calendario completo.' });
  else if (!budgetMonthSchema.safeParse(value.month).success) context.addIssue({ code: z.ZodIssueCode.custom, path: ['month'], message: 'El mes del presupuesto no es válido.' });
  if (value.currency && !['DOP', 'USD'].includes(value.currency)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['currency'], message: 'Presupuesto solo admite DOP o USD.' });
  if (extraFilters) context.addIssue({ code: z.ZodIssueCode.custom, path: ['sections'], message: 'Presupuesto abarca todos los gastos del mes y no admite filtros adicionales.' });
});

export const CreateCategoryRuleSchema = createCategoryRuleInputSchema;

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
export type BatchCreateTransactionsInput = z.infer<typeof BatchCreateTransactionsSchema>;
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;
export type TransactionQueryInput = z.infer<typeof TransactionQuerySchema>;
export type ExportQueryInput = z.infer<typeof ExportQuerySchema>;
export type FinancialReportQueryInput = z.infer<typeof FinancialReportQuerySchema>;
export type CreateCategoryRuleInput = z.infer<typeof CreateCategoryRuleSchema>;
