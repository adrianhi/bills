import { Router } from 'express';
import { appContainer } from '../app-container';
import { requireAuth, requireWorkspace } from '../middlewares/auth.middleware';
import { requireCurrentLegalAcceptance } from '../middlewares/legal.middleware';
import { asyncHandler } from '../shared/http/async-handler';

const router = Router();
router.post('/me/bootstrap', requireAuth, asyncHandler(appContainer.identityController.bootstrap));
router.get('/me', requireAuth, requireWorkspace, asyncHandler(appContainer.identityController.me));
router.post('/me/onboarding/complete', requireAuth, requireCurrentLegalAcceptance, asyncHandler(appContainer.identityController.completeOnboarding));
router.patch('/me/product-guide', requireAuth, requireCurrentLegalAcceptance, asyncHandler(appContainer.identityController.updateProductGuide));
export default router;
