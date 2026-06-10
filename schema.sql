-- Generic key-value schema for DB_PROVIDER=postgres.
-- Create this once in Railway Postgres or any PostgreSQL-compatible database.

CREATE TABLE IF NOT EXISTS kv_store (
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (collection, id)
);

CREATE INDEX IF NOT EXISTS idx_kv_store_collection ON kv_store (collection);