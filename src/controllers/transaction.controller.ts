import { Request, Response, NextFunction } from 'express';
import { transactionService } from '../services/transaction.service.js';
import { TransactionType } from '../types/index.js';
import { BadRequestError } from '../errors/app-error.js';

export class TransactionController {
  public async addTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const accountId = (req.params.accountId as string) || (req.body.account_id as string);
      if (!accountId) {
        throw new BadRequestError('Account ID is required');
      }

      const { type, amount, reference_id, description } = req.body;
      const transaction = transactionService.addTransaction(accountId, {
        type,
        amount,
        reference_id,
        description,
      });

      res.status(201).json({
        success: true,
        data: transaction,
      });
    } catch (err) {
      next(err);
    }
  }

  public async getTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const accountId = req.params.accountId as string;
      const type = req.query.type as TransactionType | undefined;
      const page = parseInt((req.query.page as string) || '1', 10);
      const limit = parseInt((req.query.limit as string) || '10', 10);

      const result = transactionService.getTransactions(
        accountId,
        { type },
        { page, limit }
      );

      res.status(200).json({
        success: true,
        current_page: result.current_page,
        page_size: result.page_size,
        total_records: result.total_records,
        total_pages: result.total_pages,
        transactions: result.transactions,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public async getTransactionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const transactionId = req.params.transactionId as string;
      const transaction = transactionService.getTransactionById(transactionId);
      res.status(200).json({
        success: true,
        data: transaction,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const transactionController = new TransactionController();
