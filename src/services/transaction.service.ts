import { v4 as uuidv4 } from 'uuid';
import { runInTransaction } from '../database/index.js';
import { accountRepository } from '../repositories/account.repository.js';
import { transactionRepository } from '../repositories/transaction.repository.js';
import {
  Transaction,
  TransactionRecord,
  TransactionType,
  PaginatedResult,
  PaginationParams,
} from '../types/index.js';
import {
  NotFoundError,
  ConflictError,
  InsufficientBalanceError,
} from '../errors/app-error.js';

export class TransactionService {
  /**
   * Adds a transaction to an account atomically.
   * Updates account balance and inserts transaction record within a single database transaction.
   */
  public addTransaction(
    accountId: string,
    data: {
      type: TransactionType;
      amount: number;
      reference_id: string;
      description?: string;
    }
  ): Transaction {
    const amountCents = Math.round(data.amount * 100);

    return runInTransaction(() => {
      // 1. Verify account exists
      const account = accountRepository.findById(accountId);
      if (!account) {
        throw new NotFoundError(`Account with ID '${accountId}' was not found`);
      }

      // 2. Check for duplicate reference_id within this specific account
      const existingTx = transactionRepository.findByAccountAndReference(accountId, data.reference_id);
      if (existingTx) {
        throw new ConflictError(
          `A transaction with reference_id '${data.reference_id}' already exists for account '${accountId}'`
        );
      }

      // 3. For debit, verify sufficient balance
      if (data.type === 'debit' && account.balance_cents < amountCents) {
        const currentBalance = (account.balance_cents / 100).toFixed(2);
        const requestedAmount = data.amount.toFixed(2);
        throw new InsufficientBalanceError(
          `Debit transaction rejected: insufficient balance. Current balance is ${currentBalance}, requested ${requestedAmount}`
        );
      }

      const now = new Date().toISOString();
      const transactionId = uuidv4();
      const deltaCents = data.type === 'credit' ? amountCents : -amountCents;

      // 4. Update account balance atomically
      accountRepository.updateBalance(accountId, deltaCents, now);

      // 5. Persist transaction record
      const record: TransactionRecord = {
        id: transactionId,
        account_id: accountId,
        type: data.type,
        amount_cents: amountCents,
        description: data.description || '',
        reference_id: data.reference_id,
        created_at: now,
      };

      transactionRepository.create(record);

      return this.mapToDto(record);
    });
  }

  /**
   * Retrieves paginated and filtered transactions for an account, sorted latest-first.
   */
  public getTransactions(
    accountId: string,
    filters: { type?: TransactionType },
    pagination: PaginationParams
  ): PaginatedResult<Transaction> {
    // Verify account exists
    const account = accountRepository.findById(accountId);
    if (!account) {
      throw new NotFoundError(`Account with ID '${accountId}' was not found`);
    }

    const { page, limit } = pagination;
    const { records, total } = transactionRepository.findByAccountId(accountId, {
      type: filters.type,
      page,
      limit,
    });

    const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);

    return {
      current_page: page,
      page_size: limit,
      total_records: total,
      total_pages: totalPages,
      transactions: records.map(this.mapToDto),
    };
  }

  public getTransactionById(id: string): Transaction {
    const record = transactionRepository.findById(id);
    if (!record) {
      throw new NotFoundError(`Transaction with ID '${id}' was not found`);
    }
    return this.mapToDto(record);
  }

  private mapToDto(record: TransactionRecord): Transaction {
    return {
      id: record.id,
      account_id: record.account_id,
      type: record.type,
      amount: record.amount_cents / 100,
      description: record.description,
      reference_id: record.reference_id,
      created_at: record.created_at,
    };
  }
}

export const transactionService = new TransactionService();
