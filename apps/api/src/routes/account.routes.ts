import { Router } from 'express';
import { AccountController } from '../controllers/account.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.post('/me/data-export', requireAuth, AccountController.exportData);
router.delete('/me', requireAuth, AccountController.remove);

export default router;
