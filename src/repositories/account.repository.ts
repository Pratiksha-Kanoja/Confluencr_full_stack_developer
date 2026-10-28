import { getDb } from '../database/index.js';
import { AccountRecord } from '../types/index.js';

export class AccountRepository {
  public create(data: { id: string; name: string; balance_cents: number; created_at: string; updated_at: string }): AccountRecord {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO accounts (id, name, balance_cents, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(data.id, data.name, data.balance_cents, data.created_at, data.updated_at);
    return data;
  }

  public findById(id: string): AccountRecord | null {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM accounts WHERE id = ?');
    const row = stmt.get(id) as unknown as AccountRecord | undefined;
    return row || null;
  }

  public updateBalance(id: string, deltaCents: number, updatedAt: string): AccountRecord | null {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE accounts
      SET balance_cents = balance_cents + ?, updated_at = ?
      WHERE id = ?
    `);
    const result = stmt.run(deltaCents, updatedAt, id);
    if ((result as any)?.changes === 0) {
      return null;
    }
    return this.findById(id);
  }

  public findAll(): AccountRecord[] {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM accounts ORDER BY created_at DESC');
    return stmt.all() as unknown as AccountRecord[];
  }
}

export const accountRepository = new AccountRepository();
