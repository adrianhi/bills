import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireWorkspace } from '../middlewares/auth.middleware';
import { WorkspaceService } from '../services/workspace.service';
import { prisma } from '../config/database';
import { LegalService } from '../services/legal.service';
import { requireCurrentLegalAcceptance } from '../middlewares/legal.middleware';

const router = Router();

router.post(
  '/me/bootstrap',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await WorkspaceService.bootstrap(req.auth!.user);
      const legalAcceptanceRequired = !(await LegalService.hasCurrentRequired(req.auth!.user.id));
      const profile = await prisma.profile.findUnique({
        where: { id: req.auth!.user.id },
        select: { onboardingCompletedAt: true },
      });
      res.status(200).json({
        success: true,
        data: {
          ...result,
          legalAcceptanceRequired,
          onboardingComplete: Boolean(profile?.onboardingCompletedAt),
        },
      });
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
          onboardingCompletedAt: true,
        },
      });
      res.status(200).json({
        success: true,
        data: {
          profile,
          workspaceId: req.auth!.workspaceId,
          role: req.auth!.role,
          legalAcceptanceRequired: !(await LegalService.hasCurrentRequired(req.auth!.user.id)),
          onboardingComplete: Boolean(profile?.onboardingCompletedAt),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/me/onboarding/complete',
  requireAuth,
  requireCurrentLegalAcceptance,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const profile = await prisma.profile.update({
        where: { id: req.auth!.user.id },
        data: { onboardingCompletedAt: new Date() },
        select: { onboardingCompletedAt: true },
      });
      res.status(200).json({ success: true, data: { onboardingComplete: true, ...profile } });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
