import path from 'path';

// Vercel functions can only write to /tmp. A database file in the project
// directory throws on startup and the whole page returns 500.
function resolveDbPath(): string {
  if (process.env.DB_PATH) return process.env.DB_PATH;
  if (process.env.VERCEL) return '/tmp/ledger.db';
  return path.join(process.cwd(), 'ledger.db');
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  dbPath: resolveDbPath(),
  isTest: process.env.NODE_ENV === 'test',
};
