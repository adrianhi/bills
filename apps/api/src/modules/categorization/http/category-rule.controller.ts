import type { Request, Response } from 'express';
import { CreateCategoryRuleSchema } from '../../../schemas/transaction.schema';
import { requestContext } from '../../../shared/application/request-context';
import { CategoryRuleApplicationService } from '../application/category-rule.service';

export class CategoryRuleController {
  constructor(private readonly service: CategoryRuleApplicationService) {}
  list = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    res.status(200).json({ success: true, data: await this.service.list(actor.workspaceId) });
  };
  create = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    const data = await this.service.create(actor.workspaceId, CreateCategoryRuleSchema.parse(req.body));
    res.status(201).json({ success: true, message: 'Category rule created successfully', data });
  };
  remove = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    await this.service.remove(actor.workspaceId, String(req.params.id));
    res.status(200).json({ success: true, message: 'Category rule deleted successfully' });
  };
}
