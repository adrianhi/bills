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
router.get('/rules/merchants', ...protectedRoute, asyncHandler(appContainer.categoryRuleController.merchants));
router.get('/rules/categories', ...protectedRoute, asyncHandler(appContainer.categoryRuleController.categories));
router.get('/rules/applications', ...protectedRoute, asyncHandler(appContainer.ruleApplicationController.recent));
router.get('/rules/applications/:applicationId', ...protectedRoute, asyncHandler(appContainer.ruleApplicationController.get));
router.post('/rules/applications/:applicationId/confirm', ...protectedRoute, asyncHandler(appContainer.ruleApplicationController.confirm));
router.post('/rules/applications/:applicationId/retry', ...protectedRoute, asyncHandler(appContainer.ruleApplicationController.retry));
router.post('/rules/:id/applications/preview', ...protectedRoute, asyncHandler(appContainer.ruleApplicationController.preview));
router.patch('/rules/:id', ...protectedRoute, asyncHandler(appContainer.categoryRuleController.update));
router.post('/rules', ...protectedRoute, asyncHandler(appContainer.categoryRuleController.create));
router.delete('/rules/:id', ...protectedRoute, asyncHandler(appContainer.categoryRuleController.remove));

export default router;
