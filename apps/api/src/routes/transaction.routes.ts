import { Router } from 'express';
import { appContainer } from '../app-container';
import { asyncHandler } from '../shared/http/async-handler';
import { requireAuth, requireWorkspace } from '../middlewares/auth.middleware';
import { requireCurrentLegalAcceptance } from '../middlewares/legal.middleware';

const router = Router();
const protectedRoute = [requireAuth, requireCurrentLegalAcceptance, requireWorkspace];

router.post('/transactions', ...protectedRoute, asyncHandler(appContainer.transactionController.create));
router.post('/transactions/batch', ...protectedRoute, asyncHandler(appContainer.transactionController.batchCreate));
router.get('/transactions/export', ...protectedRoute, asyncHandler(appContainer.transactionController.export));
router.get('/transactions', ...protectedRoute, asyncHandler(appContainer.transactionController.list));
router.get('/transactions/:id', ...protectedRoute, asyncHandler(appContainer.transactionController.get));
router.patch('/transactions/:id', ...protectedRoute, asyncHandler(appContainer.transactionController.update));
router.delete('/transactions/:id', ...protectedRoute, asyncHandler(appContainer.transactionController.remove));

export default router;
