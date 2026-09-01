import { Router } from 'express';
import { appContainer } from '../app-container';
import { asyncHandler } from '../shared/http/async-handler';
import { requireAuth, requireWorkspace } from '../middlewares/auth.middleware';
import { requireCurrentLegalAcceptance } from '../middlewares/legal.middleware';

const router = Router();
const protectedRoute = [requireAuth, requireCurrentLegalAcceptance, requireWorkspace];

router.get('/budgets/monthly', ...protectedRoute, asyncHandler(appContainer.budgetController.monthly));
router.put('/budgets/monthly', ...protectedRoute, asyncHandler(appContainer.budgetController.replace));
router.get('/budgets/suggestions', ...protectedRoute, asyncHandler(appContainer.budgetController.suggestions));
router.get('/budgets/categories', ...protectedRoute, asyncHandler(appContainer.budgetController.categories));

export default router;
