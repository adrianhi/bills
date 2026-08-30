import { Router } from 'express';
import { requireAuth, requireWorkspace } from '../middlewares/auth.middleware';
import { BankConnectionController } from '../controllers/bank-connection.controller';
import { requireCurrentLegalAcceptance } from '../middlewares/legal.middleware';

const router = Router();
const protectedRoute = [requireAuth, requireCurrentLegalAcceptance, requireWorkspace];
router.get('/financial-institutions', ...protectedRoute, BankConnectionController.institutions);

export default router;
