import { Router } from 'express';
import { accountController } from '../controllers/account.controller.js';
import { transactionController } from '../controllers/transaction.controller.js';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../middleware/validate.js';
import {
  createAccountSchema,
  accountIdParamSchema,
  addTransactionSchema,
  getTransactionsQuerySchema,
} from '../validators/schemas.js';

const router = Router();

// Create a new account
router.post(
  '/',
  validateBody(createAccountSchema),
  accountController.createAccount
);

// List all accounts
router.get('/', accountController.getAllAccounts);

// Get account details
router.get(
  '/:accountId',
  validateParams(accountIdParamSchema),
  accountController.getAccount
);

// Get account balance
router.get(
  '/:accountId/balance',
  validateParams(accountIdParamSchema),
  accountController.getBalance
);

// Add transaction to account
router.post(
  '/:accountId/transactions',
  validateParams(accountIdParamSchema),
  validateBody(addTransactionSchema),
  transactionController.addTransaction
);

// Get account transaction history with filtering & pagination
router.get(
  '/:accountId/transactions',
  validateParams(accountIdParamSchema),
  validateQuery(getTransactionsQuerySchema),
  transactionController.getTransactions
);

export default router;
