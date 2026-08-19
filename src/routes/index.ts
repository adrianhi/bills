import { Router } from 'express';
import transactionRoutes from './transaction.routes';
import statsRoutes from './stats.routes';

const router = Router();

// Mount API v1 routes
router.use('/v1', transactionRoutes);
router.use('/v1', statsRoutes);

export default router;
