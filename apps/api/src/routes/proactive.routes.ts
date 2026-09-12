import { Router } from 'express';
import { appContainer } from '../app-container';
import { requireAuth, requireWorkspace } from '../middlewares/auth.middleware';
import { requireCurrentLegalAcceptance } from '../middlewares/legal.middleware';
import { asyncHandler } from '../shared/http/async-handler';

const router = Router();
const protectedRoute = [requireAuth, requireCurrentLegalAcceptance, requireWorkspace];

router.get('/proactive/feed', ...protectedRoute, asyncHandler(appContainer.proactiveController.feed));
router.post('/proactive/actions/:actionId/dismiss', ...protectedRoute, asyncHandler(appContainer.proactiveController.dismiss));
router.get('/proactive/weekly-checkin', ...protectedRoute, asyncHandler(appContainer.proactiveController.weeklyCheckin));
router.post('/proactive/weekly-checkin/:weekKey/complete', ...protectedRoute, asyncHandler(appContainer.proactiveController.completeWeeklyCheckin));
router.post('/proactive/simulate-expense', ...protectedRoute, asyncHandler(appContainer.proactiveController.simulateExpense));
router.get('/proactive/weekly-digest/preview', ...protectedRoute, asyncHandler(appContainer.proactiveController.weeklyDigestPreview));
router.post('/proactive/weekly-digest/send-test', ...protectedRoute, asyncHandler(appContainer.proactiveController.sendWeeklyDigestTest));
router.get('/proactive/email-preferences', ...protectedRoute, asyncHandler(appContainer.proactiveController.emailPreferences));
router.put('/proactive/email-preferences', ...protectedRoute, asyncHandler(appContainer.proactiveController.updateEmailPreferences));

export default router;

