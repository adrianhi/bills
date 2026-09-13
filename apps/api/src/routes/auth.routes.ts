import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { appContainer } from '../app-container';
import { requireAuth, requireWorkspace } from '../middlewares/auth.middleware';
import { requireCurrentLegalAcceptance } from '../middlewares/legal.middleware';
import { asyncHandler } from '../shared/http/async-handler';
import { config } from '../config';

const betaInterestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.nodeEnv === 'test' ? 1000 : 15,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Demasiadas solicitudes. Por favor, inténtalo de nuevo en unos minutos.',
    },
  },
});

const router = Router();
router.post('/beta-interest', betaInterestLimiter, asyncHandler(appContainer.betaInterestController.register));
router.post('/me/bootstrap', requireAuth, asyncHandler(appContainer.identityController.bootstrap));
router.get('/me', requireAuth, requireWorkspace, asyncHandler(appContainer.identityController.me));
router.post('/me/onboarding/complete', requireAuth, requireCurrentLegalAcceptance, asyncHandler(appContainer.identityController.completeOnboarding));
router.patch('/me/product-guide', requireAuth, requireCurrentLegalAcceptance, asyncHandler(appContainer.identityController.updateProductGuide));
export default router;

