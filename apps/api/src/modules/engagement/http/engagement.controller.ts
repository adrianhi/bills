import type { Request, Response } from 'express';
import { recordProductViewSchema } from '@bills/contracts';
import { requestContext } from '../../../shared/application/request-context';
import type { EngagementService } from '../application/engagement.service';

export class EngagementController {
  constructor(private readonly service: EngagementService) {}

  recordView = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    await this.service.recordView(actor.workspaceId, actor.userId, recordProductViewSchema.parse(req.body));
    res.status(200).json({ success: true, data: { recorded: true } });
  };
}
