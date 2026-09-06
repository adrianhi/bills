import { Router } from 'express';
import { appContainer } from '../app-container';
import { requireAuth, requireWorkspace } from '../middlewares/auth.middleware';
import { requireCurrentLegalAcceptance } from '../middlewares/legal.middleware';
import { asyncHandler } from '../shared/http/async-handler';

const router = Router();
const protectedRoute = [requireAuth, requireCurrentLegalAcceptance, requireWorkspace];

router.get('/recurring', ...protectedRoute, asyncHandler(appContainer.recurringController.radar));
router.patch('/recurring/:id', ...protectedRoute, asyncHandler(appContainer.recurringController.update));
router.patch('/recurring/alerts/:id', ...protectedRoute, asyncHandler(appContainer.recurringController.acknowledgeAlert));

export default router;
