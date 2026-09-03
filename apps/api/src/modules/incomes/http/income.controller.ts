import type { Request, Response } from 'express';
import { createIncomeStreamSchema, updateIncomeStreamSchema } from '@bills/contracts';
import { requestContext } from '../../../shared/application/request-context';
import { AppError } from '../../../errors/app-error';
import type { IncomeService } from '../application/income.service';

export class IncomeController {
  constructor(private readonly service: IncomeService) {}

  public listStreams = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    const data = await this.service.listStreams(actor.workspaceId);
    res.status(200).json({ success: true, data });
  };

  public createStream = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    const input = createIncomeStreamSchema.parse(req.body);
    const data = await this.service.createStream(actor.workspaceId, input);
    res.status(201).json({ success: true, data });
  };

  public updateStream = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    const id = String(req.params.id);
    const input = updateIncomeStreamSchema.parse(req.body);
    const data = await this.service.updateStream(actor.workspaceId, id, input);
    if (!data) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Income stream not found.');
    res.status(200).json({ success: true, data });
  };

  public deleteStream = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    const id = String(req.params.id);
    const deleted = await this.service.deleteStream(actor.workspaceId, id);
    if (!deleted) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Income stream not found.');
    res.status(200).json({ success: true });
  };

  public cashFlowSummary = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    const month = typeof req.query.month === 'string' ? req.query.month : undefined;
    const currency = typeof req.query.currency === 'string' ? req.query.currency.toUpperCase() : 'DOP';

    const data = await this.service.getCashFlowSummary(actor.workspaceId, month, currency);
    res.status(200).json({ success: true, data });
  };
}
