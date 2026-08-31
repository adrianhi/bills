import type { Request, Response } from 'express';
import { FinancialReportQuerySchema } from '../../../schemas/transaction.schema';
import { requestContext } from '../../../shared/application/request-context';
import { logger } from '../../../shared/observability/logger';
import { FinancialReportService } from '../application/financial-report.service';

export class FinancialReportController {
  constructor(private readonly service: FinancialReportService) {}

  generate = async (req: Request, res: Response) => {
    const startedAt = Date.now();
    const { actor } = requestContext(req);
    const query = FinancialReportQuerySchema.parse(req.query);
    const report = await this.service.generate(actor.workspaceId, query);
    const period = query.month || query.startDate || new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', report.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="bills-informe-${period}.${report.extension}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    logger.info('financial_report_exported', { requestId: req.requestId, workspaceId: actor.workspaceId, format: query.format, rowCount: report.rowCount, durationMs: Date.now() - startedAt });
    res.status(200).send(report.buffer);
  };
}

