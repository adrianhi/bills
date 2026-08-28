import { Router } from 'express';
import { appContainer } from '../app-container';
import { asyncHandler } from '../shared/http/async-handler';
import { requireAuth, requireWorkspace } from '../middlewares/auth.middleware';
import { requireCurrentLegalAcceptance } from '../middlewares/legal.middleware';

const router = Router();
const protectedRoute = [requireAuth, requireCurrentLegalAcceptance, requireWorkspace];

router.get('/stats/summary', ...protectedRoute, asyncHandler(appContainer.analyticsController.summary));
router.get('/categories', ...protectedRoute, asyncHandler(appContainer.analyticsController.categories));

// Category rules management
router.get('/rules', ...protectedRoute, asyncHandler(appContainer.categoryRuleController.list));
router.post('/rules', ...protectedRoute, asyncHandler(appContainer.categoryRuleController.create));
router.delete('/rules/:id', ...protectedRoute, asyncHandler(appContainer.categoryRuleController.remove));

export default router;
