import { Router } from 'express';
import { StatsController } from '../controllers/stats.controller';
import { requireAuth, requireWorkspace } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth, requireWorkspace);
router.get('/stats/summary', StatsController.getSummary);
router.get('/categories', StatsController.listCategories);

// Category rules management
router.get('/rules', StatsController.listRules);
router.post('/rules', StatsController.createRule);
router.delete('/rules/:id', StatsController.deleteRule);

export default router;
