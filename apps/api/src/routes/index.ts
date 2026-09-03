import { Router } from 'express';
import transactionRoutes from './transaction.routes';
import statsRoutes from './stats.routes';
import authRoutes from './auth.routes';
import bankConnectionRoutes from './bank-connection.routes';
import inboxConnectionRoutes from './inbox-connection.routes';
import legalRoutes from './legal.routes';
import accountRoutes from './account.routes';
import reportRoutes from './report.routes';
import budgetRoutes from './budget.routes';
import incomeRoutes from './income.routes';
import { appContainer } from '../app-container';
import { asyncHandler } from '../shared/http/async-handler';

const router = Router();

router.get('/v1/health/ready', asyncHandler(appContainer.readinessController.handle));
router.post('/v1/internal/maintenance/tick', asyncHandler(appContainer.maintenanceController.tick));

// Mount API v1 routes
router.use('/v1', authRoutes);
router.use('/v1', transactionRoutes);
router.use('/v1', statsRoutes);
router.use('/v1', bankConnectionRoutes);
router.use('/v1', inboxConnectionRoutes);
router.use('/v1', legalRoutes);
router.use('/v1', accountRoutes);
router.use('/v1', reportRoutes);
router.use('/v1', budgetRoutes);
router.use('/v1', incomeRoutes);

export default router;
