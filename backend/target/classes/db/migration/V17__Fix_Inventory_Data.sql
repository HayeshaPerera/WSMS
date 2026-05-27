-- Fix NULL is_deleted in inventory
UPDATE inventory SET is_deleted = false WHERE is_deleted IS NULL;
ALTER TABLE inventory ALTER COLUMN is_deleted SET DEFAULT false;

-- Ensure every product has an active inventory record for the main warehouse
INSERT INTO inventory (product_id, warehouse_id, quantity, reorder_level, location, last_updated, created_at, updated_at, is_deleted, low_stock_alert)
SELECT p.id, 1, 0, p.reorder_level, 'Central Warehouse', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, false, false
FROM products p
WHERE p.is_deleted = false
  AND NOT EXISTS (
      SELECT 1 FROM inventory i 
      WHERE i.product_id = p.id AND i.warehouse_id = 1 AND i.is_deleted = false
  );
