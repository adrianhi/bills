import type { Request, Response } from 'express';
import { BatchCreateTransactionsSchema, CreateTransactionSchema, ExportQuerySchema, TransactionQuerySchema, UpdateTransactionSchema } from '../../../schemas/transaction.schema';
import { requestContext } from '../../../shared/application/request-context';
import { TransactionApplicationService } from '../application/transaction-application.service';
import { serializeTransaction, transactionsToCsv } from './transaction.presenter';

export class TransactionHttpController {
  constructor(private readonly service: TransactionApplicationService) {}
  create = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    const result = await this.service.create(actor.workspaceId, CreateTransactionSchema.parse(req.body));
    res.status(result.isDuplicate ? 200 : 201).json({ success: true, duplicate: result.isDuplicate,
      message: result.isDuplicate ? 'Transaction already processed (Idempotent)' : 'Transaction recorded successfully', data: serializeTransaction(result.transaction) });
  };
  batchCreate = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    const input = BatchCreateTransactionsSchema.parse(req.body);
    const result = await this.service.batchCreate(actor.workspaceId, input.transactions);
    res.status(201).json({ success: true, message: `Processed ${result.total} transactions (${result.createdCount} created, ${result.duplicateCount} duplicates ignored)`,
      data: { ...result, items: result.items.map((item) => ({ ...item, transaction: serializeTransaction(item.transaction) })) } });
  };
  list = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    const result = await this.service.list(actor.workspaceId, TransactionQuerySchema.parse(req.query));
    res.status(200).json({ success: true, ...result, data: result.data.map(serializeTransaction) });
  };
  get = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    res.status(200).json({ success: true, data: serializeTransaction(await this.service.get(actor.workspaceId, String(req.params.id))) });
  };
  update = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    const data = await this.service.update(actor.workspaceId, String(req.params.id), UpdateTransactionSchema.parse(req.body));
    res.status(200).json({ success: true, message: 'Transaction updated successfully', data: serializeTransaction(data) });
  };
  remove = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    await this.service.remove(actor.workspaceId, String(req.params.id));
    res.status(200).json({ success: true, message: 'Transaction deleted successfully' });
  };
  export = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    const query = ExportQuerySchema.parse(req.query);
    const transactions = await this.service.export(actor.workspaceId, query);
    const suffix = query.month || new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="bills-export-${suffix}.${query.format}"`);
    if (query.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.status(200).send(transactionsToCsv(transactions)); return;
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({ success: true, exportedAt: new Date().toISOString(), totalCount: transactions.length, data: transactions.map(serializeTransaction) });
  };
}
