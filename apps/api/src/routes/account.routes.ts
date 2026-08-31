import { Router } from 'express';
import { appContainer } from '../app-container';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.post('/me/data-export', requireAuth, appContainer.accountController.exportData);
router.delete('/me', requireAuth, appContainer.accountController.remove);

export default router;
