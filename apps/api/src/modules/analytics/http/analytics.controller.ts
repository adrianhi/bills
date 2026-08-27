import type { Request, Response } from 'express';
import { requestContext } from '../../../shared/application/request-context';
import { AnalyticsService } from '../application/analytics.service';

export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}
  summary = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    const data = await this.service.getSummary(actor.workspaceId, {
      month: req.query.month as string | undefined, startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      organization: (req.query.organization || req.query.institutionCode) as string | undefined,
      currency: req.query.currency as string | undefined,
    });
    res.status(200).json({ success: true, data });
  };
  categories = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    res.status(200).json({ success: true, data: await this.service.listCategories(actor.workspaceId) });
  };
}
