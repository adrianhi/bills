import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { appContainer } from '../app-container';
import { requireAuth, requireWorkspace } from '../middlewares/auth.middleware';
import { requireCurrentLegalAcceptance } from '../middlewares/legal.middleware';
import { asyncHandler } from '../shared/http/async-handler';

const router = Router();
const reportLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: 'draft-8', legacyHeaders: false });

router.get('/reports/financial-export', requireAuth, requireCurrentLegalAcceptance, requireWorkspace, reportLimit, asyncHandler(appContainer.financialReportController.generate));

export default router;

