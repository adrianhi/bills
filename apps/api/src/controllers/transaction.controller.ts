import { Request, Response, NextFunction } from 'express';
import { stringify } from 'csv-stringify/sync';
import {
  CreateTransactionSchema,
  BatchCreateTransactionsSchema,
  UpdateTransactionSchema,
  TransactionQuerySchema,
  ExportQuerySchema,
} from '../schemas/transaction.schema';
import { TransactionService } from '../services/transaction.service';

export class TransactionController {
  /**
   * POST /api/v1/transactions
   * Ingestion endpoint (called by n8n or client).
   * Idempotent: returns 200 if duplicate, 201 if newly created.
   */
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = CreateTransactionSchema.parse(req.body);
      const result = await TransactionService.createTransaction(validatedData);

      if (result.isDuplicate) {
        res.status(200).json({
          success: true,
          duplicate: true,
          message: 'Transaction already processed (Idempotent)',
          data: result.transaction,
        });
        return;
      }

      res.status(201).json({
        success: true,
        duplicate: false,
        message: 'Transaction recorded successfully',
        data: result.transaction,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/transactions/batch
   * Ingests a list of transactions in bulk.
   */
  public static async batchCreate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = BatchCreateTransactionsSchema.parse(req.body);
      const result = await TransactionService.batchCreateTransactions(validatedData.transactions);

      res.status(201).json({
        success: true,
        message: `Processed ${result.total} transactions (${result.createdCount} created, ${result.duplicateCount} duplicates ignored)`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/transactions
   * Feed / Query endpoint with filters, pagination and summary totals.
   */
  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = TransactionQuerySchema.parse(req.query);
      const result = await TransactionService.getTransactions(query);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/transactions/:id
   * Get transaction by ID.
   */
  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const transaction = await TransactionService.getTransactionById(id);

      if (!transaction) {
        res.status(404).json({
          success: false,
          error: 'Transaction not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/transactions/:id
   * Update category, merchant, notes or status.
   */
  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const validatedData = UpdateTransactionSchema.parse(req.body);

      const existing = await TransactionService.getTransactionById(id);
      if (!existing) {
        res.status(404).json({
          success: false,
          error: 'Transaction not found',
        });
        return;
      }

      const updated = await TransactionService.updateTransaction(id, validatedData);
      res.status(200).json({
        success: true,
        message: 'Transaction updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/transactions/:id
   * Delete transaction.
   */
  public static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const existing = await TransactionService.getTransactionById(id);
      if (!existing) {
        res.status(404).json({
          success: false,
          error: 'Transaction not found',
        });
        return;
      }

      await TransactionService.deleteTransaction(id);
      res.status(200).json({
        success: true,
        message: 'Transaction deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/transactions/export
   * Export transactions as CSV or JSON for Excel, Google Sheets, PowerBI, etc.
   */
  public static async export(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = ExportQuerySchema.parse(req.query);
      const transactions = await TransactionService.getTransactionsForExport(query);

      const filenameSuffix = query.month || new Date().toISOString().slice(0, 10);

      if (query.format === 'csv') {
        const rows = transactions.map((t) => ({
          'ID Transacción': t.id,
          'ID Externo (Gmail)': t.externalId,
          'Entidad / Banco': TransactionService.getOrganization(t.source, t.merchant),
          'Fecha Transacción': t.transactionDate.toISOString(),
          'Tarjeta': t.cardLast4 ? `**** ${t.cardLast4}` : 'N/A',
          'Tipo Tarjeta': t.cardType || 'N/A',
          'Comercio Crudo': t.rawMerchant,
          'Comercio': t.merchant,
          'Categoría': t.category,
          'Monto': t.amount.toFixed(2),
          'Moneda': t.currency,
          'Estado': t.status,
          'Tipo Transacción': t.transactionType,
          'Fuente': t.source,
          'Notas': t.notes || '',
          'Fecha Registro': t.createdAt.toISOString(),
        }));

        const csvOutput = stringify(rows, {
          header: true,
          bom: true, // UTF-8 BOM for Microsoft Excel compatibility
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="bills-export-${filenameSuffix}.csv"`
        );
        res.status(200).send(csvOutput);
        return;
      }

      // Default to JSON export
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="bills-export-${filenameSuffix}.json"`
      );
      res.status(200).json({
        success: true,
        exportedAt: new Date().toISOString(),
        totalCount: transactions.length,
        data: transactions,
      });
    } catch (error) {
      next(error);
    }
  }
}
