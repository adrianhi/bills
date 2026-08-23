import { Router } from 'express';
import { LegalController } from '../controllers/legal.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/legal/current', LegalController.current);
router.get('/legal/me/current', requireAuth, LegalController.current);
router.post('/legal/accept', requireAuth, LegalController.accept);

export default router;
