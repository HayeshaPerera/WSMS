-- Fix NULL is_deleted and is_active across all tables
UPDATE users SET is_deleted = false WHERE is_deleted IS NULL;
UPDATE users SET is_active = true WHERE is_active IS NULL;
ALTER TABLE users ALTER COLUMN is_deleted SET DEFAULT false;
ALTER TABLE users ALTER COLUMN is_active SET DEFAULT true;

UPDATE products SET is_deleted = false WHERE is_deleted IS NULL;
UPDATE products SET is_active = true WHERE is_active IS NULL;
ALTER TABLE products ALTER COLUMN is_deleted SET DEFAULT false;
ALTER TABLE products ALTER COLUMN is_active SET DEFAULT true;

UPDATE warehouses SET is_deleted = false WHERE is_deleted IS NULL;
UPDATE warehouses SET is_active = true WHERE is_active IS NULL;

UPDATE supermarkets SET is_deleted = false WHERE is_deleted IS NULL;
UPDATE supermarkets SET is_active = true WHERE is_active IS NULL;
