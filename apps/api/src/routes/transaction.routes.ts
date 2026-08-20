import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller';
import { requireApiKey, optionalApiKey } from '../middlewares/auth.middleware';

const router = Router();

// Ingestion endpoints (Require API Key for webhook/n8n)
router.post('/transactions', requireApiKey, TransactionController.create);
router.post('/transactions/batch', requireApiKey, TransactionController.batchCreate);

// Export endpoint (Allow optional API key or browser download)
router.get('/transactions/export', optionalApiKey, TransactionController.export);

// Feed & CRUD endpoints
router.get('/transactions', optionalApiKey, TransactionController.list);
router.get('/transactions/:id', optionalApiKey, TransactionController.getById);
router.patch('/transactions/:id', optionalApiKey, TransactionController.update);
router.delete('/transactions/:id', optionalApiKey, TransactionController.delete);

export default router;
