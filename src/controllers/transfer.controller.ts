import { Request, Response, NextFunction } from 'express';
import { transferService } from '../services/transfer.service.js';

export class TransferController {
  public async executeTransfer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        source_account_id,
        destination_account_id,
        amount,
        reference_id,
        description,
      } = req.body;

      const result = transferService.executeTransfer({
        source_account_id,
        destination_account_id,
        amount,
        reference_id,
        description,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const transferController = new TransferController();
