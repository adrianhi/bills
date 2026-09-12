import type { Request, Response } from 'express';
import {
  budgetCurrencySchema,
  completeWeeklyCheckinSchema,
  dismissProactiveActionSchema,
  sendWeeklyDigestTestSchema,
  simulateExpenseInputSchema,
  updateEmailNotificationPreferencesSchema,
} from '@bills/contracts';
import { requestContext } from '../../../shared/application/request-context';
import type { ProactiveEngineService } from '../application/proactive-engine.service';
import type { ProactiveEmailService } from '../application/proactive-email.service';

export class ProactiveController {
  constructor(private readonly service: ProactiveEngineService, private readonly email: ProactiveEmailService) {}

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
    const preview = await this.email.previewWeekly(actor.workspaceId, actor.userId, currency);

    if (req.query.format === 'html') {
      res.status(200).type('html').send(preview.html);
      return;
    }

    res.status(200).json({ success: true, data: preview });
  };

  sendWeeklyDigestTest = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    const input = sendWeeklyDigestTestSchema.parse(req.body || {});
    const result = await this.email.sendTest(actor.workspaceId, actor.userId, input.currency);

    res.status(200).json({ success: true, data: result });
  };

  emailPreferences = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    res.status(200).json({ success: true, data: await this.email.getPreferences(actor.workspaceId, actor.userId) });
  };

  updateEmailPreferences = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    const input = updateEmailNotificationPreferencesSchema.parse(req.body);
    res.status(200).json({ success: true, data: await this.email.updatePreferences(actor.workspaceId, actor.userId, input) });
  };
}

