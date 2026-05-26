ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_type VARCHAR(50);
UPDATE products SET unit_type = unit WHERE unit_type IS NULL AND unit IS NOT NULL;
ALTER TABLE products DROP COLUMN IF EXISTS unit;
ALTER TABLE products DROP COLUMN IF EXISTS unit_price;
