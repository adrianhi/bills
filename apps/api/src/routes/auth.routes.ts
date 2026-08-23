import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireWorkspace } from '../middlewares/auth.middleware';
import { WorkspaceService } from '../services/workspace.service';
import { prisma } from '../config/database';

const router = Router();

router.post(
  '/me/bootstrap',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await WorkspaceService.bootstrap(req.auth!.user);
      res.status(200).json({ success: true, data: result });
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
        data: { profile, workspaceId: req.auth!.workspaceId, role: req.auth!.role },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
