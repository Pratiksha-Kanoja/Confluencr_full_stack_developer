import { DatabaseSync } from 'node:sqlite';
import { config } from '../config/index.js';
import { SCHEMA_SQL } from './schema.js';

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = initDb();
  }
  return dbInstance;
}

export function initDb(dbPath?: string): DatabaseSync {
  const targetPath = dbPath || (config.isTest ? ':memory:' : config.dbPath);
  
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // ignore
    }
  }

  const db = new DatabaseSync(targetPath);
  
  // Set PRAGMA configurations
  db.exec('PRAGMA foreign_keys = ON;');
  if (targetPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA synchronous = NORMAL;');
  }

  // Execute schema creation
  db.exec(SCHEMA_SQL);

  dbInstance = db;
  return dbInstance;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Execute a callback within an immediate database transaction.
 * SQLite's BEGIN IMMEDIATE locks the database against concurrent writes right away,
 * preventing deadlock and race conditions during balance checks and updates.
 */
export function runInTransaction<T>(fn: () => T): T {
  const db = getDb();
  db.exec('BEGIN IMMEDIATE;');
  try {
    const result = fn();
    db.exec('COMMIT;');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK;');
    } catch {
      // rollback could fail if connection broke
    }
    throw err;
  }
}
