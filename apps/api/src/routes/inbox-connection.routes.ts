import { Router } from 'express';
import { InboxConnectionController } from '../controllers/inbox-connection.controller';
import { requireAuth, requireWorkspace } from '../middlewares/auth.middleware';

const router = Router();

router.get('/oauth/google/callback', InboxConnectionController.googleCallback);
router.use(requireAuth, requireWorkspace);
router.get('/inbox-connections', InboxConnectionController.list);
router.post('/inbox-connections/google/start', InboxConnectionController.startGoogle);
router.post('/inbox-connections/:id/sync', InboxConnectionController.sync);
router.delete('/inbox-connections/:id', InboxConnectionController.remove);

export default router;
