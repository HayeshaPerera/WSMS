-- V19: Forcefully ensure ONLY SL Supermarket and SL Warehouse exist.

-- 1. Rename the FIRST active warehouse to SL Warehouse
UPDATE warehouses 
SET name = 'SL Warehouse', 
    code = 'WH-SL-01',
    location = 'Sri Lanka',
    address = 'Sri Lanka',
    manager_name = 'Admin'
WHERE id = (SELECT id FROM warehouses WHERE is_deleted = false ORDER BY id ASC LIMIT 1);

-- 2. Soft-delete ALL OTHER warehouses
UPDATE warehouses 
SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP
WHERE id != (SELECT id FROM warehouses WHERE is_deleted = false ORDER BY id ASC LIMIT 1);

-- 3. Rename the FIRST active supermarket to SL Supermarket
UPDATE supermarkets 
SET name = 'SL Supermarket', 
    code = 'SM-SL-01',
    branch_code = 'SM-SL-01',
    location = 'Sri Lanka',
    address = 'Sri Lanka',
    manager_name = 'Admin'
WHERE id = (SELECT id FROM supermarkets WHERE is_deleted = false ORDER BY id ASC LIMIT 1);

-- 4. Soft-delete ALL OTHER supermarkets
UPDATE supermarkets 
SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP
WHERE id != (SELECT id FROM supermarkets WHERE is_deleted = false ORDER BY id ASC LIMIT 1);

-- 5. Hard update ALL Inventory records to point to the SL Warehouse and SL Supermarket
-- Any inventory for deleted warehouses moves to the main warehouse
UPDATE inventory 
SET warehouse_id = (SELECT id FROM warehouses WHERE is_deleted = false ORDER BY id ASC LIMIT 1)
WHERE warehouse_id IS NOT NULL;

UPDATE inventory 
SET supermarket_id = (SELECT id FROM supermarkets WHERE is_deleted = false ORDER BY id ASC LIMIT 1)
WHERE supermarket_id IS NOT NULL;

-- 6. Hard update ALL Deliveries to point to the main warehouse/supermarket
UPDATE deliveries 
SET warehouse_id = (SELECT id FROM warehouses WHERE is_deleted = false ORDER BY id ASC LIMIT 1),
    supermarket_id = (SELECT id FROM supermarkets WHERE is_deleted = false ORDER BY id ASC LIMIT 1);

-- 7. Hard update ALL Stock Requests
UPDATE stock_requests 
SET warehouse_id = (SELECT id FROM warehouses WHERE is_deleted = false ORDER BY id ASC LIMIT 1),
    supermarket_id = (SELECT id FROM supermarkets WHERE is_deleted = false ORDER BY id ASC LIMIT 1);

-- 8. Hard update Sales History
UPDATE sales_history 
SET supermarket_id = (SELECT id FROM supermarkets WHERE is_deleted = false ORDER BY id ASC LIMIT 1);

