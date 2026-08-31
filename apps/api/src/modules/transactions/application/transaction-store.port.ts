import type {
  CreateTransactionInput,
  ExportQueryInput,
  TransactionQueryInput,
  UpdateTransactionInput,
} from '../../../schemas/transaction.schema';

export interface StoredTransaction {
  id: string;
  workspaceId: string | null;
  institutionCode: string;
  ingestionChannel: string;
  externalId: string;
  cardLast4: string | null;
  cardType: string | null;
  rawMerchant: string;
  merchant: string;
  category: string;
  amount: { toFixed(digits: number): string; toString(): string };
  currency: string;
  status: string;
  statusCode: string;
  statusUpdatedAt: Date | null;
  transactionType: string;
  transactionDate: Date;
  source: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionWriteResult {
  isDuplicate: boolean;
  transaction: StoredTransaction;
  statusUpdated?: boolean;
}

export interface TransactionListResult {
  data: StoredTransaction[];
  pagination: { page: number; limit: number; total: number; totalItems: number; totalPages: number };
  summary: {
    totalTransactions: number;
    totalDOP: number;
    totalUSD: number;
    byCategory: Record<string, { dop: number; usd: number; count: number }>;
  };
}

export interface TransactionWriter {
  create(workspaceId: string, input: CreateTransactionInput): Promise<TransactionWriteResult>;
  update(workspaceId: string, id: string, input: UpdateTransactionInput): Promise<StoredTransaction | null>;
  remove(workspaceId: string, id: string): Promise<number>;
}

export interface TransactionReader {
  list(workspaceId: string, query: TransactionQueryInput): Promise<TransactionListResult>;
  get(workspaceId: string, id: string): Promise<StoredTransaction | null>;
  export(workspaceId: string, query: ExportQueryInput, limit?: number): Promise<StoredTransaction[]>;
}
