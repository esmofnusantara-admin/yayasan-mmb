import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Store SQLite DB file in /app/data/ so it can be persisted via Docker volume
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'yayasan.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Universal key-value table: one table for all collections
// Each row: (collection, id, data as JSON string)
db.exec(`
  CREATE TABLE IF NOT EXISTS kv (
    collection TEXT NOT NULL,
    id         TEXT NOT NULL,
    data       TEXT NOT NULL,
    PRIMARY KEY (collection, id)
  );
`);

console.log(`[SQLite] Database ready at: ${dbPath}`);

export const dbDriver = {
  async getDocs(collectionName: string): Promise<any[]> {
    const stmt = db.prepare('SELECT data FROM kv WHERE collection = ?');
    const rows = stmt.all(collectionName) as { data: string }[];
    return rows.map(r => JSON.parse(r.data));
  },

  async getDoc(collectionName: string, docId: string): Promise<any | null> {
    if (!docId || typeof docId !== 'string') {
      console.warn(`[dbDriver.getDoc] Invalid or missing docId: "${docId}" in collection "${collectionName}"`);
      return null;
    }
    const stmt = db.prepare('SELECT data FROM kv WHERE collection = ? AND id = ?');
    const row = stmt.get(collectionName, docId) as { data: string } | undefined;
    return row ? JSON.parse(row.data) : null;
  },

  async setDoc(collectionName: string, docId: string, data: any): Promise<void> {
    if (!docId || typeof docId !== 'string') {
      console.error(`[dbDriver.setDoc] Invalid or missing docId: "${docId}" in collection "${collectionName}"`);
      return;
    }
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO kv (collection, id, data) VALUES (?, ?, ?)'
    );
    stmt.run(collectionName, docId, JSON.stringify(data));
  },

  async updateDoc(collectionName: string, docId: string, partialData: any): Promise<void> {
    if (!docId || typeof docId !== 'string') {
      console.error(`[dbDriver.updateDoc] Invalid or missing docId: "${docId}" in collection "${collectionName}"`);
      return;
    }
    const stmt = db.prepare('SELECT data FROM kv WHERE collection = ? AND id = ?');
    const row = stmt.get(collectionName, docId) as { data: string } | undefined;
    const existing = row ? JSON.parse(row.data) : {};
    const merged = { ...existing, ...partialData };
    const upsert = db.prepare(
      'INSERT OR REPLACE INTO kv (collection, id, data) VALUES (?, ?, ?)'
    );
    upsert.run(collectionName, docId, JSON.stringify(merged));
  },

  async deleteDoc(collectionName: string, docId: string): Promise<void> {
    if (!docId || typeof docId !== 'string') {
      console.error(`[dbDriver.deleteDoc] Invalid or missing docId: "${docId}" in collection "${collectionName}"`);
      return;
    }
    const stmt = db.prepare('DELETE FROM kv WHERE collection = ? AND id = ?');
    stmt.run(collectionName, docId);
  }
};

export default dbDriver;
