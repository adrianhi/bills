import { Router } from 'express';
import { appContainer } from '../app-container';
import { requireAuth, requireWorkspace } from '../middlewares/auth.middleware';
import { requireCurrentLegalAcceptance } from '../middlewares/legal.middleware';
import { asyncHandler } from '../shared/http/async-handler';

const router = Router();
router.post('/engagement/views', requireAuth, requireCurrentLegalAcceptance, requireWorkspace,
  asyncHandler(appContainer.engagementController.recordView));

export default router;
