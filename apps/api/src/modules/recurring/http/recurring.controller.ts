import type { Request, Response } from 'express';
import { acknowledgeRecurringAlertSchema, budgetCurrencySchema, createRecurringBillSchema, updateRecurringBillSchema } from '@bills/contracts';
import { z } from 'zod';
import { AppError } from '../../../errors/app-error';
import { requestContext } from '../../../shared/application/request-context';
import type { RecurringService } from '../application/recurring.service';

export class RecurringController {
  constructor(private readonly service: RecurringService) {}

  radar = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    const currency = budgetCurrencySchema.parse(String(req.query.currency || '').toUpperCase());
    const window = z.coerce.number().pipe(z.union([z.literal(7), z.literal(14), z.literal(30)])).default(30).parse(req.query.window);
    res.status(200).json({ success: true, data: await this.service.radar(actor.workspaceId, currency, window) });
  };

  create = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    const input = createRecurringBillSchema.parse(req.body);
    const result = await this.service.create(actor.workspaceId, actor.userId, input);
    res.status(201).json({ success: true, data: result });
  };

  update = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    const result = await this.service.update(actor.workspaceId, actor.userId, String(req.params.id), updateRecurringBillSchema.parse(req.body));
    if (!result) throw new AppError(404, 'RECURRING_BILL_NOT_FOUND', 'No encontramos ese cobro recurrente.');
    res.status(200).json({ success: true, data: result });
  };

  acknowledgeAlert = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    acknowledgeRecurringAlertSchema.parse(req.body);
    if (!await this.service.acknowledgeAlert(actor.workspaceId, String(req.params.id))) {
      throw new AppError(404, 'RECURRING_ALERT_NOT_FOUND', 'No encontramos esa alerta.');
    }
    res.status(200).json({ success: true, data: { acknowledged: true } });
  };
}
