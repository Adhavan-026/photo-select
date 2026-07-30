import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

let dbInstance: Database | null = null;

export async function getDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const dbDir = path.resolve(process.env.DB_DIR || './data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, 'agent.db');

  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // Create tables if they do not exist
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS local_config (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS watched_folders (
      id TEXT PRIMARY KEY,
      path TEXT UNIQUE,
      album_id TEXT
    );

    CREATE TABLE IF NOT EXISTS local_images (
      id TEXT PRIMARY KEY,
      album_id TEXT,
      filename TEXT,
      local_path TEXT UNIQUE,
      hash TEXT,
      sync_status TEXT DEFAULT 'PENDING',
      width INTEGER,
      height INTEGER,
      file_size INTEGER,
      thumbnail_path TEXT,
      preview_path TEXT,
      watermark_preview_path TEXT,
      exif_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_images_album ON local_images(album_id);
    CREATE INDEX IF NOT EXISTS idx_images_sync ON local_images(sync_status);
  `);

  console.log(`📂 SQLite database initialized successfully at: ${dbPath}`);
  return dbInstance;
}
export default getDatabase;
