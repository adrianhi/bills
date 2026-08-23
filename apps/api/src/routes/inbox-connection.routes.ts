import { Router } from 'express';
import { InboxConnectionController } from '../controllers/inbox-connection.controller';
import { requireAuth, requireWorkspace } from '../middlewares/auth.middleware';
import { requireCurrentLegalAcceptance } from '../middlewares/legal.middleware';

const router = Router();
const protectedRoute = [requireAuth, requireCurrentLegalAcceptance, requireWorkspace];

router.get('/oauth/google/callback', InboxConnectionController.googleCallback);
router.get('/inbox-connections', ...protectedRoute, InboxConnectionController.list);
router.post('/inbox-connections/google/start', ...protectedRoute, InboxConnectionController.startGoogle);
router.post('/inbox-connections/:id/sync', ...protectedRoute, InboxConnectionController.sync);
router.delete('/inbox-connections/:id', ...protectedRoute, InboxConnectionController.remove);

export default router;
