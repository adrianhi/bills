import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller';
import { requireAuth, requireWorkspace } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth, requireWorkspace);
router.post('/transactions', TransactionController.create);
router.post('/transactions/batch', TransactionController.batchCreate);
router.get('/transactions/export', TransactionController.export);
router.get('/transactions', TransactionController.list);
router.get('/transactions/:id', TransactionController.getById);
router.patch('/transactions/:id', TransactionController.update);
router.delete('/transactions/:id', TransactionController.delete);

export default router;
