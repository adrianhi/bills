import { Router } from 'express';
import { appContainer } from '../app-container';
import { requireAuth, requireWorkspace } from '../middlewares/auth.middleware';
import { requireCurrentLegalAcceptance } from '../middlewares/legal.middleware';

const router = Router();
const protectedRoute = [requireAuth, requireCurrentLegalAcceptance, requireWorkspace];

router.get(
  ['/oauth/google/callback', '/auth/google/callback', '/google/callback'],
  appContainer.inboxConnectionController.googleCallback
);
router.get('/inbox-connections', ...protectedRoute, appContainer.inboxConnectionController.list);
router.post('/inbox-connections/google/start', ...protectedRoute, appContainer.inboxConnectionController.startGoogle);
router.put('/inbox-connections/:id/institutions', ...protectedRoute, appContainer.inboxConnectionController.updateInstitutions);
router.post('/inbox-connections/:id/sync', ...protectedRoute, appContainer.inboxConnectionController.sync);
router.delete('/inbox-connections/:id', ...protectedRoute, appContainer.inboxConnectionController.remove);

export default router;
