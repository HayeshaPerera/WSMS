-- ============================================================
-- V2: Add soft delete support to core tables
-- Adds deleted_at column for soft-delete pattern
-- ============================================================

ALTER TABLE products   ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE supermarkets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE users      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE inventory  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Index to efficiently filter non-deleted records
CREATE INDEX IF NOT EXISTS idx_products_not_deleted    ON products(id)    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_warehouses_not_deleted  ON warehouses(id)  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_supermarkets_not_deleted ON supermarkets(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_not_deleted       ON users(id)       WHERE deleted_at IS NULL;
