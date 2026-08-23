import { Router } from 'express';
import transactionRoutes from './transaction.routes';
import statsRoutes from './stats.routes';
import authRoutes from './auth.routes';
import bankConnectionRoutes from './bank-connection.routes';

const router = Router();

// Mount API v1 routes
router.use('/v1', authRoutes);
router.use('/v1', transactionRoutes);
router.use('/v1', statsRoutes);
router.use('/v1', bankConnectionRoutes);

export default router;
