-- Delete all but one warehouse
UPDATE warehouses 
SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP 
WHERE id > 1;

-- Delete all but one supermarket
UPDATE supermarkets 
SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP 
WHERE id > 1;

-- Soft delete inventory related to deleted warehouses and supermarkets
UPDATE inventory 
SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP 
WHERE warehouse_id > 1 OR supermarket_id > 1;
