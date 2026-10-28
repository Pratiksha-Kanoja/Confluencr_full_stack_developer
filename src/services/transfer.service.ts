import { v4 as uuidv4 } from 'uuid';
import { runInTransaction } from '../database/index.js';
import { accountRepository } from '../repositories/account.repository.js';
import { transactionRepository } from '../repositories/transaction.repository.js';
import { TransferResult } from '../types/index.js';
import {
  NotFoundError,
  BadRequestError,
  InsufficientBalanceError,
  ConflictError,
} from '../errors/app-error.js';

export class TransferService {
  /**
   * Transfers funds atomically between two accounts.
   * If any step fails, SQLite rolls back all balance changes and transactions automatically.
   */
  public executeTransfer(data: {
    source_account_id: string;
    destination_account_id: string;
    amount: number;
    reference_id: string;
    description?: string;
  }): TransferResult {
    if (data.source_account_id === data.destination_account_id) {
      throw new BadRequestError('Source and destination accounts must be different');
    }

    const amountCents = Math.round(data.amount * 100);

    return runInTransaction(() => {
      // 1. Verify both accounts exist
      const sourceAccount = accountRepository.findById(data.source_account_id);
      if (!sourceAccount) {
        throw new NotFoundError(`Source account '${data.source_account_id}' was not found`);
      }

      const destAccount = accountRepository.findById(data.destination_account_id);
      if (!destAccount) {
        throw new NotFoundError(`Destination account '${data.destination_account_id}' was not found`);
      }

      // 2. Verify source account has sufficient balance
      if (sourceAccount.balance_cents < amountCents) {
        const sourceBal = (sourceAccount.balance_cents / 100).toFixed(2);
        const reqAmt = data.amount.toFixed(2);
        throw new InsufficientBalanceError(
          `Transfer rejected: source account has insufficient balance. Available: ${sourceBal}, required: ${reqAmt}`
        );
      }

      // Reference IDs for child transactions
      const sourceRef = `TRF-OUT-${data.reference_id}`;
      const destRef = `TRF-IN-${data.reference_id}`;

      // Check if duplicate transaction already exists on source or dest
      if (transactionRepository.findByAccountAndReference(data.source_account_id, sourceRef)) {
        throw new ConflictError(`Transfer with reference_id '${data.reference_id}' was already executed`);
      }

      const now = new Date().toISOString();
      const transferId = uuidv4();
      const sourceTxId = uuidv4();
      const destTxId = uuidv4();
      const desc = data.description || 'Account Transfer';

      // 3. Atomically debit source account and record debit transaction
      accountRepository.updateBalance(data.source_account_id, -amountCents, now);
      const sourceTx = transactionRepository.create({
        id: sourceTxId,
        account_id: data.source_account_id,
        type: 'debit',
        amount_cents: amountCents,
        description: `Transfer to ${destAccount.name}: ${desc}`,
        reference_id: sourceRef,
        created_at: now,
      });

      // 4. Atomically credit destination account and record credit transaction
      accountRepository.updateBalance(data.destination_account_id, amountCents, now);
      const destTx = transactionRepository.create({
        id: destTxId,
        account_id: data.destination_account_id,
        type: 'credit',
        amount_cents: amountCents,
        description: `Transfer from ${sourceAccount.name}: ${desc}`,
        reference_id: destRef,
        created_at: now,
      });

      // 5. Record transfer in transfers table
      transactionRepository.createTransfer({
        id: transferId,
        source_account_id: data.source_account_id,
        destination_account_id: data.destination_account_id,
        amount_cents: amountCents,
        reference_id: data.reference_id,
        description: desc,
        source_tx_id: sourceTxId,
        destination_tx_id: destTxId,
        created_at: now,
      });

      return {
        transfer_id: transferId,
        source_account_id: data.source_account_id,
        destination_account_id: data.destination_account_id,
        amount: data.amount,
        reference_id: data.reference_id,
        description: desc,
        created_at: now,
        source_transaction: {
          id: sourceTx.id,
          account_id: sourceTx.account_id,
          type: sourceTx.type,
          amount: sourceTx.amount_cents / 100,
          description: sourceTx.description,
          reference_id: sourceTx.reference_id,
          created_at: sourceTx.created_at,
        },
        destination_transaction: {
          id: destTx.id,
          account_id: destTx.account_id,
          type: destTx.type,
          amount: destTx.amount_cents / 100,
          description: destTx.description,
          reference_id: destTx.reference_id,
          created_at: destTx.created_at,
        },
      };
    });
  }
}

export const transferService = new TransferService();
