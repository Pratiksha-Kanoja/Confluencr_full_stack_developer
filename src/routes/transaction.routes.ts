import { Router } from 'express';
import { transactionController } from '../controllers/transaction.controller.js';

const router = Router();

// Get transaction by transaction ID
router.get('/:transactionId', transactionController.getTransactionById);

// Direct transaction creation endpoint (if account_id provided in body)
router.post('/', transactionController.addTransaction);

export default router;
