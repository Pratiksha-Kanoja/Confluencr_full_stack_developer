import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error.js';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Check for JSON body parse error
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Malformed JSON payload in request body',
      },
    });
    return;
  }

  // Check for custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Check for SQLite database constraint errors
  const errMessage = err?.message || '';

  if (errMessage.includes('UNIQUE constraint failed: transactions.account_id, transactions.reference_id')) {
    res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_TRANSACTION',
        message: 'A transaction with this reference_id already exists for this account',
      },
    });
    return;
  }

  if (errMessage.includes('CHECK constraint failed: balance_cents >= 0')) {
    res.status(422).json({
      success: false,
      error: {
        code: 'INSUFFICIENT_BALANCE',
        message: 'Debit transaction rejected: account does not have sufficient balance',
      },
    });
    return;
  }

  if (errMessage.includes('FOREIGN KEY constraint failed')) {
    res.status(404).json({
      success: false,
      error: {
        code: 'ACCOUNT_NOT_FOUND',
        message: 'Referenced account does not exist',
      },
    });
    return;
  }

  // Unexpected server error
  console.error('[UNEXPECTED ERROR]', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred',
    },
  });
}
