import { Router } from 'express';
import { StatsController } from '../controllers/stats.controller';
import { requireAuth, requireWorkspace } from '../middlewares/auth.middleware';
import { requireCurrentLegalAcceptance } from '../middlewares/legal.middleware';

const router = Router();
const protectedRoute = [requireAuth, requireCurrentLegalAcceptance, requireWorkspace];

router.get('/stats/summary', ...protectedRoute, StatsController.getSummary);
router.get('/categories', ...protectedRoute, StatsController.listCategories);

// Category rules management
router.get('/rules', ...protectedRoute, StatsController.listRules);
router.post('/rules', ...protectedRoute, StatsController.createRule);
router.delete('/rules/:id', ...protectedRoute, StatsController.deleteRule);

export default router;
