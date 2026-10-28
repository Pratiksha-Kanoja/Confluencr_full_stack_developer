import { getDb } from '../database/index.js';
import { TransactionRecord, TransactionType } from '../types/index.js';

export class TransactionRepository {
  public create(data: TransactionRecord): TransactionRecord {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO transactions (id, account_id, type, amount_cents, description, reference_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      data.id,
      data.account_id,
      data.type,
      data.amount_cents,
      data.description,
      data.reference_id,
      data.created_at
    );
    return data;
  }

  public findByAccountAndReference(accountId: string, referenceId: string): TransactionRecord | null {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM transactions
      WHERE account_id = ? AND reference_id = ?
    `);
    const row = stmt.get(accountId, referenceId) as unknown as TransactionRecord | undefined;
    return row || null;
  }

  public findById(id: string): TransactionRecord | null {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM transactions WHERE id = ?');
    const row = stmt.get(id) as unknown as TransactionRecord | undefined;
    return row || null;
  }

  public findByAccountId(
    accountId: string,
    options: { type?: TransactionType; page: number; limit: number }
  ): { records: TransactionRecord[]; total: number } {
    const db = getDb();
    const { type, page, limit } = options;
    const offset = (page - 1) * limit;

    let countQuery = 'SELECT COUNT(*) as count FROM transactions WHERE account_id = ?';
    let dataQuery = 'SELECT * FROM transactions WHERE account_id = ?';
    const params: any[] = [accountId];

    if (type) {
      countQuery += ' AND type = ?';
      dataQuery += ' AND type = ?';
      params.push(type);
    }

    // Latest-first order based on created_at (with rowid DESC tie-breaker for sub-millisecond precision)
    dataQuery += ' ORDER BY created_at DESC, rowid DESC LIMIT ? OFFSET ?';

    const countStmt = db.prepare(countQuery);
    const countRow = (type ? countStmt.get(accountId, type) : countStmt.get(accountId)) as { count: number };
    const total = countRow ? Number(countRow.count) : 0;

    const dataStmt = db.prepare(dataQuery);
    const queryParams = [...params, limit, offset];
    const records = dataStmt.all(...queryParams) as unknown as TransactionRecord[];

    return { records, total };
  }

  public createTransfer(data: {
    id: string;
    source_account_id: string;
    destination_account_id: string;
    amount_cents: number;
    reference_id: string;
    description: string;
    source_tx_id: string;
    destination_tx_id: string;
    created_at: string;
  }): void {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO transfers (
        id, source_account_id, destination_account_id,
        amount_cents, reference_id, description,
        source_tx_id, destination_tx_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      data.id,
      data.source_account_id,
      data.destination_account_id,
      data.amount_cents,
      data.reference_id,
      data.description,
      data.source_tx_id,
      data.destination_tx_id,
      data.created_at
    );
  }
}

export const transactionRepository = new TransactionRepository();
