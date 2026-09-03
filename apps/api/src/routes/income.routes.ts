import { Router } from 'express';
import { appContainer } from '../app-container';
import { requireAuth, requireWorkspace } from '../middlewares/auth.middleware';
import { requireCurrentLegalAcceptance } from '../middlewares/legal.middleware';
import { asyncHandler } from '../shared/http/async-handler';

const router = Router();
const protectedRoute = [requireAuth, requireCurrentLegalAcceptance, requireWorkspace];

router.get('/incomes/streams', ...protectedRoute, asyncHandler(appContainer.incomeController.listStreams));
router.post('/incomes/streams', ...protectedRoute, asyncHandler(appContainer.incomeController.createStream));
router.patch('/incomes/streams/:id', ...protectedRoute, asyncHandler(appContainer.incomeController.updateStream));
router.delete('/incomes/streams/:id', ...protectedRoute, asyncHandler(appContainer.incomeController.deleteStream));
router.get('/incomes/cashflow', ...protectedRoute, asyncHandler(appContainer.incomeController.cashFlowSummary));

export default router;
