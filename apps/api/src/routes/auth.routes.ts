import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireWorkspace } from '../middlewares/auth.middleware';
import { WorkspaceService } from '../services/workspace.service';
import { prisma } from '../config/database';
import { LegalService } from '../services/legal.service';

const router = Router();

router.post(
  '/me/bootstrap',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await WorkspaceService.bootstrap(req.auth!.user);
      const legalAcceptanceRequired = !(await LegalService.hasCurrentRequired(req.auth!.user.id));
      res.status(200).json({ success: true, data: { ...result, legalAcceptanceRequired } });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/me',
  requireAuth,
  requireWorkspace,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const profile = await prisma.profile.findUnique({
        where: { id: req.auth!.user.id },
        select: {
          id: true,
          email: true,
          displayName: true,
          timezone: true,
          defaultCurrency: true,
        },
      });
      res.status(200).json({
        success: true,
        data: {
          profile,
          workspaceId: req.auth!.workspaceId,
          role: req.auth!.role,
          legalAcceptanceRequired: !(await LegalService.hasCurrentRequired(req.auth!.user.id)),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
