-- V18: Rename the remaining warehouse and supermarket to the SL 1-to-1 system

-- Rename the only remaining warehouse
UPDATE warehouses 
SET name = 'SL Warehouse', 
    code = 'WH-SL-01',
    location = 'Sri Lanka',
    address = 'Sri Lanka',
    manager_name = 'Admin'
WHERE id = (SELECT id FROM warehouses WHERE is_deleted = false ORDER BY id ASC LIMIT 1);

-- Rename the only remaining supermarket
UPDATE supermarkets 
SET name = 'SL Supermarket', 
    code = 'SM-SL-01',
    branch_code = 'SM-SL-01',
    location = 'Sri Lanka',
    address = 'Sri Lanka',
    manager_name = 'Admin'
WHERE id = (SELECT id FROM supermarkets WHERE is_deleted = false ORDER BY id ASC LIMIT 1);

-- Deactivate all other user accounts so only 'admin' remains
UPDATE users 
SET is_active = false 
WHERE username != 'admin';

-- Ensure admin is active
UPDATE users 
SET is_active = true 
WHERE username = 'admin';
