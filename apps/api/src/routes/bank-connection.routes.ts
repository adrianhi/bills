import { Router } from 'express';
import { requireAuth, requireWorkspace } from '../middlewares/auth.middleware';
import { BankConnectionController } from '../controllers/bank-connection.controller';
import { requireCurrentLegalAcceptance } from '../middlewares/legal.middleware';

const router = Router();
const protectedRoute = [requireAuth, requireCurrentLegalAcceptance, requireWorkspace];
router.get('/financial-institutions', ...protectedRoute, BankConnectionController.institutions);
router.get('/bank-connections', ...protectedRoute, BankConnectionController.list);
router.post('/bank-connections', ...protectedRoute, BankConnectionController.create);
router.post('/bank-connections/:id/rotate-address', ...protectedRoute, BankConnectionController.rotate);
router.delete('/bank-connections/:id', ...protectedRoute, BankConnectionController.remove);

export default router;
