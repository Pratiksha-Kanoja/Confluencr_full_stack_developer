import { Router } from 'express';
import { transferController } from '../controllers/transfer.controller.js';
import { validateBody } from '../middleware/validate.js';
import { transferSchema } from '../validators/schemas.js';

const router = Router();

// Execute money transfer between two accounts
router.post(
  '/',
  validateBody(transferSchema),
  transferController.executeTransfer
);

export default router;
