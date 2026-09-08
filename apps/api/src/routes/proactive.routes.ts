import { Router } from 'express';
import { appContainer } from '../app-container';
import { requireAuth, requireWorkspace } from '../middlewares/auth.middleware';
import { requireCurrentLegalAcceptance } from '../middlewares/legal.middleware';
import { asyncHandler } from '../shared/http/async-handler';

const router = Router();
const protectedRoute = [requireAuth, requireCurrentLegalAcceptance, requireWorkspace];

router.get('/proactive/feed', ...protectedRoute, asyncHandler(appContainer.proactiveController.feed));
router.post('/proactive/actions/:actionId/dismiss', ...protectedRoute, asyncHandler(appContainer.proactiveController.dismiss));

export default router;
