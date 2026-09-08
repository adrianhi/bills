import type { Request, Response } from 'express';
import { budgetCurrencySchema, dismissProactiveActionSchema } from '@bills/contracts';
import { requestContext } from '../../../shared/application/request-context';
import type { ProactiveEngineService } from '../application/proactive-engine.service';

export class ProactiveController {
  constructor(private readonly service: ProactiveEngineService) {}

  feed = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    const currency = budgetCurrencySchema.parse(String(req.query.currency || 'DOP').toUpperCase());
    const feed = await this.service.getFeed(actor.workspaceId, actor.userId, currency);
    res.status(200).json({ success: true, data: feed });
  };

  dismiss = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    const { actionId } = dismissProactiveActionSchema.parse({ actionId: req.params.actionId });
    await this.service.dismissAction(actor.workspaceId, actor.userId, actionId);
    res.status(200).json({ success: true, data: { dismissed: true, actionId } });
  };
}
