import type { Request, Response } from 'express';
import { z } from 'zod';
import { previewRuleApplicationSchema } from '@bills/contracts';
import { requestContext } from '../../../shared/application/request-context';
import type { RuleApplicationActions } from '../application/rule-application.port';

export class RuleApplicationController {
  constructor(private readonly applications: RuleApplicationActions) {}
  preview = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    res.status(202).json({ success: true, data: await this.applications.preview(actor.workspaceId,
      String(req.params.id), previewRuleApplicationSchema.parse(req.body)) });
  };
  get = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    res.json({ success: true, data: await this.applications.get(actor.workspaceId, z.string().uuid().parse(req.params.applicationId)) });
  };
  recent = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    res.json({ success: true, data: await this.applications.recent(actor.workspaceId) });
  };
  confirm = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    res.status(202).json({ success: true, data: await this.applications.confirm(actor.workspaceId, z.string().uuid().parse(req.params.applicationId)) });
  };
  retry = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    res.status(202).json({ success: true, data: await this.applications.retry(actor.workspaceId, z.string().uuid().parse(req.params.applicationId)) });
  };
}
