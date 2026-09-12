import type { Request, Response } from 'express';
import {
  budgetCurrencySchema,
  completeWeeklyCheckinSchema,
  dismissProactiveActionSchema,
  sendWeeklyDigestTestSchema,
  simulateExpenseInputSchema,
} from '@bills/contracts';
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

  weeklyCheckin = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    const currency = budgetCurrencySchema.parse(String(req.query.currency || 'DOP').toUpperCase());
    const checkin = await this.service.getWeeklyCheckin(actor.workspaceId, actor.userId, currency);
    res.status(200).json({ success: true, data: checkin });
  };

  completeWeeklyCheckin = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    const currency = budgetCurrencySchema.parse(String(req.query.currency || 'DOP').toUpperCase());
    const { weekKey } = completeWeeklyCheckinSchema.parse({ weekKey: req.params.weekKey });
    const checkin = await this.service.completeWeeklyCheckin(actor.workspaceId, actor.userId, weekKey, currency);
    res.status(200).json({ success: true, data: checkin });
  };

  simulateExpense = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    const input = simulateExpenseInputSchema.parse(req.body);
    const result = await this.service.simulateExpense(actor.workspaceId, input);
    res.status(200).json({ success: true, data: result });
  };

  weeklyDigestPreview = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    const currency = budgetCurrencySchema.parse(String(req.query.currency || 'DOP').toUpperCase());
    const recipient = req.auth?.user?.email || 'usuario@bills.local';
    const displayName = req.auth?.user?.displayName || 'Ahorrador';
    const appUrl = `${req.protocol}://${req.get('host')}`;

    const preview = await this.service.getWeeklyDigestPreview(
      actor.workspaceId,
      actor.userId,
      recipient,
      displayName,
      currency,
      appUrl
    );

    if (req.query.format === 'html') {
      res.status(200).type('html').send(preview.html);
      return;
    }

    res.status(200).json({ success: true, data: preview });
  };

  sendWeeklyDigestTest = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    const input = sendWeeklyDigestTestSchema.parse(req.body || {});
    const recipient = input.recipientEmail || req.auth?.user?.email || 'usuario@bills.local';
    const displayName = req.auth?.user?.displayName || 'Ahorrador';
    const appUrl = `${req.protocol}://${req.get('host')}`;

    const result = await this.service.sendWeeklyDigestTest(
      actor.workspaceId,
      actor.userId,
      recipient,
      displayName,
      input.currency,
      appUrl
    );

    res.status(200).json({ success: true, data: result });
  };
}

