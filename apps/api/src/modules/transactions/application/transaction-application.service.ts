import type { CreateTransactionInput, ExportQueryInput, TransactionQueryInput, UpdateTransactionInput } from '../../../schemas/transaction.schema';
import { AppError } from '../../../errors/app-error';
import { TransactionService } from '../../../services/transaction.service';

export class TransactionApplicationService {
  create(workspaceId: string, input: CreateTransactionInput) { return TransactionService.createTransaction(workspaceId, input); }
  batchCreate(workspaceId: string, input: CreateTransactionInput[]) { return TransactionService.batchCreateTransactions(workspaceId, input); }
  list(workspaceId: string, query: TransactionQueryInput) { return TransactionService.getTransactions(workspaceId, query); }
  async get(workspaceId: string, id: string) {
    const transaction = await TransactionService.getTransactionById(workspaceId, id);
    if (!transaction) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Transaction not found.');
    return transaction;
  }
  async update(workspaceId: string, id: string, input: UpdateTransactionInput) {
    const transaction = await TransactionService.updateTransaction(workspaceId, id, input);
    if (!transaction) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Transaction not found.');
    return transaction;
  }
  async remove(workspaceId: string, id: string) {
    const deleted = await TransactionService.deleteTransaction(workspaceId, id);
    if (!deleted) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Transaction not found.');
  }
  export(workspaceId: string, query: ExportQueryInput, limit?: number) { return TransactionService.getTransactionsForExport(workspaceId, query, limit); }
}
