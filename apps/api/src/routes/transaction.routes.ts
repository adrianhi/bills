import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller';
import { requireAuth, requireWorkspace } from '../middlewares/auth.middleware';
import { requireCurrentLegalAcceptance } from '../middlewares/legal.middleware';

const router = Router();
const protectedRoute = [requireAuth, requireCurrentLegalAcceptance, requireWorkspace];

router.post('/transactions', ...protectedRoute, TransactionController.create);
router.post('/transactions/batch', ...protectedRoute, TransactionController.batchCreate);
router.get('/transactions/export', ...protectedRoute, TransactionController.export);
router.get('/transactions', ...protectedRoute, TransactionController.list);
router.get('/transactions/:id', ...protectedRoute, TransactionController.getById);
router.patch('/transactions/:id', ...protectedRoute, TransactionController.update);
router.delete('/transactions/:id', ...protectedRoute, TransactionController.delete);

export default router;
