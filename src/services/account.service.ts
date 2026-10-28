import { v4 as uuidv4 } from 'uuid';
import { accountRepository } from '../repositories/account.repository.js';
import { Account, AccountRecord } from '../types/index.js';
import { NotFoundError } from '../errors/app-error.js';

export class AccountService {
  public createAccount(name: string): Account {
    const now = new Date().toISOString();
    const id = uuidv4();

    // Initial balance is ALWAYS 0 as strictly required
    const initialBalanceCents = 0;

    const record = accountRepository.create({
      id,
      name,
      balance_cents: initialBalanceCents,
      created_at: now,
      updated_at: now,
    });

    return this.mapToDto(record);
  }

  public getAccountById(id: string): Account {
    const record = accountRepository.findById(id);
    if (!record) {
      throw new NotFoundError(`Account with ID '${id}' was not found`);
    }
    return this.mapToDto(record);
  }

  public getAccountBalance(id: string): { account_id: string; balance: number; name: string; created_at: string } {
    const record = accountRepository.findById(id);
    if (!record) {
      throw new NotFoundError(`Account with ID '${id}' was not found`);
    }

    return {
      account_id: record.id,
      balance: record.balance_cents / 100,
      name: record.name,
      created_at: record.created_at,
    };
  }

  public getAllAccounts(): Account[] {
    const records = accountRepository.findAll();
    return records.map(this.mapToDto);
  }

  private mapToDto(record: AccountRecord): Account {
    return {
      id: record.id,
      name: record.name,
      balance: record.balance_cents / 100,
      created_at: record.created_at,
    };
  }
}

export const accountService = new AccountService();
