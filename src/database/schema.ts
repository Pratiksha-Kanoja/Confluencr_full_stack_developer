export const SCHEMA_SQL = `
-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  balance_cents INTEGER NOT NULL DEFAULT 0 CHECK(balance_cents >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('credit', 'debit')),
  amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
  description TEXT NOT NULL DEFAULT '',
  reference_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
  UNIQUE(account_id, reference_id)
);

-- Indexes for performance & query optimization
CREATE INDEX IF NOT EXISTS idx_transactions_account_created 
  ON transactions(account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_account_type_created 
  ON transactions(account_id, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_account_ref 
  ON transactions(account_id, reference_id);

-- Transfers table (Bonus feature)
CREATE TABLE IF NOT EXISTS transfers (
  id TEXT PRIMARY KEY,
  source_account_id TEXT NOT NULL,
  destination_account_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
  reference_id TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  source_tx_id TEXT NOT NULL,
  destination_tx_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (source_account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (destination_account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (source_tx_id) REFERENCES transactions(id) ON DELETE RESTRICT,
  FOREIGN KEY (destination_tx_id) REFERENCES transactions(id) ON DELETE RESTRICT,
  CHECK(source_account_id <> destination_account_id)
);
`;
