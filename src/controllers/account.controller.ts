import { Request, Response, NextFunction } from 'express';
import { accountService } from '../services/account.service.js';

export class AccountController {
  public async createAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name } = req.body;
      const account = accountService.createAccount(name);
      res.status(201).json({
        success: true,
        data: account,
      });
    } catch (err) {
      next(err);
    }
  }

  public async getAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const accountId = req.params.accountId as string;
      const account = accountService.getAccountById(accountId);
      res.status(200).json({
        success: true,
        data: account,
      });
    } catch (err) {
      next(err);
    }
  }

  public async getBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const accountId = req.params.accountId as string;
      const balanceData = accountService.getAccountBalance(accountId);
      res.status(200).json({
        success: true,
        data: balanceData,
      });
    } catch (err) {
      next(err);
    }
  }

  public async getAllAccounts(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const accounts = accountService.getAllAccounts();
      res.status(200).json({
        success: true,
        data: accounts,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const accountController = new AccountController();
