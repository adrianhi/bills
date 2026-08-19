import { Router } from 'express';
import { StatsController } from '../controllers/stats.controller';
import { optionalApiKey, requireApiKey } from '../middlewares/auth.middleware';

const router = Router();

router.get('/stats/summary', optionalApiKey, StatsController.getSummary);
router.get('/categories', optionalApiKey, StatsController.listCategories);

// Category rules management
router.get('/rules', optionalApiKey, StatsController.listRules);
router.post('/rules', requireApiKey, StatsController.createRule);
router.delete('/rules/:id', requireApiKey, StatsController.deleteRule);

export default router;
