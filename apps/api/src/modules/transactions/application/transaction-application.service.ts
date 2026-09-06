import type {
  CreateTransactionInput,
  ExportQueryInput,
  TransactionQueryInput,
  UpdateTransactionInput,
} from '../../../schemas/transaction.schema';
import { AppError } from '../../../errors/app-error';
import type { TransactionReader, TransactionWriter } from './transaction-store.port';
import { isIncomeMovement } from '../domain/transaction-policy';

function assertVisibleExpense(input: CreateTransactionInput) {
  if (isIncomeMovement(input)) {
    throw new AppError(400, 'INCOME_MANUAL_ENTRY_DISABLED', 'Manual income entry is not available.');
  }
}

export class TransactionApplicationService {
  public constructor(
    private readonly writer: TransactionWriter,
    private readonly reader: TransactionReader
  ) {}

  public create(workspaceId: string, input: CreateTransactionInput) {
    assertVisibleExpense(input);
    return this.writer.create(workspaceId, input);
  }

  public async batchCreate(workspaceId: string, input: CreateTransactionInput[]) {
    input.forEach(assertVisibleExpense);
    const items = await Promise.all(input.map((item) => this.writer.create(workspaceId, item)));
    const duplicateCount = items.filter((item) => item.isDuplicate).length;
    return { total: items.length, createdCount: items.length - duplicateCount, duplicateCount, items };
  }

  public list(workspaceId: string, query: TransactionQueryInput) {
    return this.reader.list(workspaceId, query);
  }

  public async get(workspaceId: string, id: string) {
    const transaction = await this.reader.get(workspaceId, id);
    if (!transaction) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Transaction not found.');
    return transaction;
  }

  public async update(workspaceId: string, id: string, input: UpdateTransactionInput) {
    if (isIncomeMovement(input)) throw new AppError(400, 'INCOME_MANUAL_ENTRY_DISABLED', 'Income categories are not available.');
    const transaction = await this.writer.update(workspaceId, id, input);
    if (!transaction) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Transaction not found.');
    return transaction;
  }

  public async remove(workspaceId: string, id: string) {
    const deleted = await this.writer.remove(workspaceId, id);
    if (!deleted) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Transaction not found.');
  }

  public export(workspaceId: string, query: ExportQueryInput, limit?: number) {
    return this.reader.export(workspaceId, query, limit);
  }
}
