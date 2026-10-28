import { Router } from 'express';
import accountRoutes from './account.routes.js';
import transactionRoutes from './transaction.routes.js';
import transferRoutes from './transfer.routes.js';

const router = Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Transaction Ledger API',
    version: '1.0.0',
  });
});

router.use('/accounts', accountRoutes);
router.use('/transactions', transactionRoutes);
router.use('/transfers', transferRoutes);

export default router;
