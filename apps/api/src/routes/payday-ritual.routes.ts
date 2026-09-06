import { Router } from 'express';
import { appContainer } from '../app-container';
import { requireAuth, requireWorkspace } from '../middlewares/auth.middleware';
import { requireCurrentLegalAcceptance } from '../middlewares/legal.middleware';
import { asyncHandler } from '../shared/http/async-handler';

const router = Router();
const protectedRoute = [requireAuth, requireCurrentLegalAcceptance, requireWorkspace];

router.get('/payday-ritual/current', ...protectedRoute, asyncHandler(appContainer.paydayRitualController.current));
router.post('/payday-ritual/:cycleKey/complete', ...protectedRoute, asyncHandler(appContainer.paydayRitualController.complete));

export default router;
