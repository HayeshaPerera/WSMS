-- Soft delete all inventory records linked to a supermarket
UPDATE inventory 
SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP 
WHERE supermarket_id IS NOT NULL;
