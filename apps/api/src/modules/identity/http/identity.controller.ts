import type { Request, Response } from 'express';
import { AppError } from '../../../errors/app-error';
import { IdentityApplicationService } from '../application/identity.service';

const user = (req: Request) => {
  if (!req.auth?.user) throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required.');
  return req.auth.user;
};
export class IdentityController {
  constructor(private readonly service: IdentityApplicationService) {}
  bootstrap = async (req: Request, res: Response) => { res.status(200).json({ success: true, data: await this.service.bootstrap(user(req)) }); };
  me = async (req: Request, res: Response) => { res.status(200).json({ success: true, data: await this.service.me(user(req), req.auth!.workspaceId!, req.auth!.role) }); };
  completeOnboarding = async (req: Request, res: Response) => { res.status(200).json({ success: true, data: await this.service.completeOnboarding(user(req).id) }); };
}
