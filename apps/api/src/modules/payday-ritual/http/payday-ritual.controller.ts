import type { Request, Response } from 'express';
import { budgetCurrencySchema, completePaydayRitualSchema } from '@bills/contracts';
import { AppError } from '../../../errors/app-error';
import { requestContext } from '../../../shared/application/request-context';
import type { PaydayRitualService } from '../application/payday-ritual.service';

const currencyFrom = (req: Request) => budgetCurrencySchema.parse(String(req.query.currency || '').toUpperCase());

export class PaydayRitualController {
  constructor(private readonly service: PaydayRitualService) {}

  current = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    res.status(200).json({
      success: true,
      data: await this.service.current(actor.workspaceId, actor.userId, currencyFrom(req)),
    });
  };

  complete = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    const { cycleKey } = completePaydayRitualSchema.parse({ cycleKey: req.params.cycleKey });
    const result = await this.service.complete(actor.workspaceId, actor.userId, cycleKey, currencyFrom(req));
    if (!result) throw new AppError(409, 'PAYDAY_CYCLE_NOT_CURRENT', 'Esta quincena ya no está activa.');
    res.status(200).json({ success: true, data: result });
  };
}
