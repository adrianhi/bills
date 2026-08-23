import { Router } from 'express';
import { requireAuth, requireWorkspace } from '../middlewares/auth.middleware';
import { BankConnectionController } from '../controllers/bank-connection.controller';

const router = Router();
router.use(requireAuth, requireWorkspace);
router.get('/financial-institutions', BankConnectionController.institutions);
router.get('/bank-connections', BankConnectionController.list);
router.post('/bank-connections', BankConnectionController.create);
router.post('/bank-connections/:id/rotate-address', BankConnectionController.rotate);
router.delete('/bank-connections/:id', BankConnectionController.remove);

export default router;
