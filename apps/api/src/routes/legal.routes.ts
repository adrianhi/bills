import { Router } from 'express';
import { appContainer } from '../app-container';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/legal/current', appContainer.legalController.current);
router.get('/legal/me/current', requireAuth, appContainer.legalController.current);
router.post('/legal/accept', requireAuth, appContainer.legalController.accept);

export default router;
