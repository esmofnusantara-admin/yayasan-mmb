-- ============================================================
-- schema.sql — dipakai saat DB_PROVIDER=postgres
-- Jalankan sekali di Supabase / Neon / Render Postgres:
--   psql $DATABASE_URL -f schema.sql
-- ============================================================

-- Satu tabel generik untuk semua koleksi (mirip Firestore dokumen).
-- Kolom `data` adalah JSONB sehingga bisa menyimpan struktur apapun.
CREATE TABLE IF NOT EXISTS kv_store (
  collection TEXT    NOT NULL,
  id         TEXT    NOT NULL,
  data       JSONB   NOT NULL DEFAULT '{}',
  PRIMARY KEY (collection, id)
);

-- Index opsional untuk query berdasarkan field dalam JSONB (contoh: deleted flag)
CREATE INDEX IF NOT EXISTS idx_kv_collection ON kv_store (collection);
