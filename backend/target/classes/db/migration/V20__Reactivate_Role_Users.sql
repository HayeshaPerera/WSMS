-- V20: Reactivate the role-based users and ensure they are tied to the SL system entities

-- Reactivate warehouse1
UPDATE users 
SET is_active = true,
    warehouse_id = (SELECT id FROM warehouses WHERE is_deleted = false ORDER BY id ASC LIMIT 1),
    supermarket_id = NULL
WHERE username = 'warehouse1';

-- Reactivate supermarket1
UPDATE users 
SET is_active = true,
    supermarket_id = (SELECT id FROM supermarkets WHERE is_deleted = false ORDER BY id ASC LIMIT 1),
    warehouse_id = NULL
WHERE username = 'supermarket1';

-- Also make sure 'admin' is active, just in case
UPDATE users 
SET is_active = true 
WHERE username = 'admin';
