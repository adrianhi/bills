import { Router } from 'express';
import { requireAuth, requireWorkspace } from '../middlewares/auth.middleware';
import { appContainer } from '../app-container';
import { requireCurrentLegalAcceptance } from '../middlewares/legal.middleware';

const router = Router();
const protectedRoute = [requireAuth, requireCurrentLegalAcceptance, requireWorkspace];
router.get('/financial-institutions', ...protectedRoute, appContainer.bankConnectionController.list);

export default router;
