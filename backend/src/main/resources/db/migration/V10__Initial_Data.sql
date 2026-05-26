-- V5: Initial Data - Roles, Sample Warehouses, Supermarkets, Sample Users, Notification Templates

-- Insert Roles
INSERT INTO roles (role_name, description) VALUES
    ('ADMIN', 'System Administrator with full access') ON CONFLICT DO NOTHING;
INSERT INTO roles (role_name, description) VALUES
    ('WAREHOUSE_STAFF', 'Warehouse personnel managing inventory and deliveries') ON CONFLICT DO NOTHING;
INSERT INTO roles (role_name, description) VALUES
    ('SUPERMARKET_MANAGER', 'Supermarket branch manager') ON CONFLICT DO NOTHING;
INSERT INTO roles (role_name, description) VALUES
    ('WAREHOUSE_MANAGER', 'Warehouse manager with approval rights') ON CONFLICT DO NOTHING;
INSERT INTO roles (role_name, description) VALUES
    ('SYSTEM', 'System generated actions') ON CONFLICT DO NOTHING;

-- Ensure columns exist before inserting
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS manager_name VARCHAR(255);
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS code VARCHAR(50);
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS address VARCHAR(200);

-- Insert Sample Warehouses
INSERT INTO warehouses (code, name, location, address, capacity, manager_name, contact_phone, contact_email) VALUES
    ('WH-COL-001', 'Central Warehouse - Colombo', 'Colombo 04', 'Colombo 04', 50000.00, 'Mr. Silva', '0711234567', 'warehouse.colombo@wsms.lk') ON CONFLICT DO NOTHING;
INSERT INTO warehouses (code, name, location, address, capacity, manager_name, contact_phone, contact_email) VALUES
    ('WH-KND-001', 'Regional Warehouse - Kandy', 'Kandy', 'Kandy', 30000.00, 'Mr. Perera', '0812345678', 'warehouse.kandy@wsms.lk') ON CONFLICT DO NOTHING;
INSERT INTO warehouses (code, name, location, address, capacity, manager_name, contact_phone, contact_email) VALUES
    ('WH-GAL-001', 'Southern Warehouse - Galle', 'Galle', 'Galle', 25000.00, 'Mr. De Silva', '0912345678', 'warehouse.galle@wsms.lk') ON CONFLICT DO NOTHING;

ALTER TABLE supermarkets ADD COLUMN IF NOT EXISTS manager_name VARCHAR(255);
ALTER TABLE supermarkets ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);
ALTER TABLE supermarkets ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE supermarkets ADD COLUMN IF NOT EXISTS code VARCHAR(50);
ALTER TABLE supermarkets ADD COLUMN IF NOT EXISTS address VARCHAR(200);
ALTER TABLE supermarkets ADD COLUMN IF NOT EXISTS branch_code VARCHAR(50);
ALTER TABLE supermarkets ADD COLUMN IF NOT EXISTS par_level_setting DECIMAL(5, 2) DEFAULT 1.2;

-- Insert Sample Supermarkets
INSERT INTO supermarkets (code, name, branch_code, location, address, manager_name, contact_phone, contact_email, par_level_setting, storage_capacity) VALUES
    ('SM-COL-001', 'Fresh Mart - Colombo', 'FM-COL-001', 'Colombo 01', 'Colombo 01', 'Ms. Ranasinghe', '0701234567', 'manager.col@freshmart.lk', 1.2, 5000) ON CONFLICT DO NOTHING;
INSERT INTO supermarkets (code, name, branch_code, location, address, manager_name, contact_phone, contact_email, par_level_setting, storage_capacity) VALUES
    ('SM-KND-002', 'Fresh Mart - Kandy', 'FM-KND-002', 'Kandy', 'Kandy', 'Mr. Jayasekara', '0812567890', 'manager.kandy@freshmart.lk', 1.15, 3000) ON CONFLICT DO NOTHING;
INSERT INTO supermarkets (code, name, branch_code, location, address, manager_name, contact_phone, contact_email, par_level_setting, storage_capacity) VALUES
    ('SM-GAL-003', 'Fresh Mart - Galle', 'FM-GAL-003', 'Galle', 'Galle', 'Mr. Fernando', '0912567890', 'manager.galle@freshmart.lk', 1.3, 2500) ON CONFLICT DO NOTHING;
INSERT INTO supermarkets (code, name, branch_code, location, address, manager_name, contact_phone, contact_email, par_level_setting, storage_capacity) VALUES
    ('SM-COL-003', 'Metro Store - Colombo', 'MS-COL-001', 'Colombo 03', 'Colombo 03', 'Ms. Liyanage', '0701567890', 'manager.metro@metrostore.lk', 1.25, 4000) ON CONFLICT DO NOTHING;

-- Ensure columns exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS current_unit_price DECIMAL(10, 2);

-- Insert Sample Products
INSERT INTO products (name, sku, category, unit, current_unit_price, unit_price, reorder_level, description) VALUES
    ('Basmati Rice Premium 5kg', 'SKU-001-RICE', 'Grains', 'bag', 550.00, 550.00, 20, 'Premium basmati rice in 5kg bags') ON CONFLICT DO NOTHING;
INSERT INTO products (name, sku, category, unit, current_unit_price, unit_price, reorder_level, description) VALUES
    ('Sunflower Oil 1L', 'SKU-002-OIL', 'Oils', 'bottle', 280.00, 280.00, 30, 'Pure sunflower cooking oil 1 liter') ON CONFLICT DO NOTHING;
INSERT INTO products (name, sku, category, unit, current_unit_price, unit_price, reorder_level, description) VALUES
    ('Chicken Breast 1kg', 'SKU-003-CHICKEN', 'Proteins', 'kg', 650.00, 650.00, 10, 'Fresh chicken breast per kg') ON CONFLICT DO NOTHING;
INSERT INTO products (name, sku, category, unit, current_unit_price, unit_price, reorder_level, description) VALUES
    ('Tomato Powder 500g', 'SKU-004-TOMATO', 'Spices', 'packet', 120.00, 120.00, 50, 'Tomato powder 500g packet') ON CONFLICT DO NOTHING;
INSERT INTO products (name, sku, category, unit, current_unit_price, unit_price, reorder_level, description) VALUES
    ('Milk Powder 400g', 'SKU-005-MILK', 'Dairy', 'tin', 420.00, 420.00, 25, 'Full cream milk powder 400g tin') ON CONFLICT DO NOTHING;
INSERT INTO products (name, sku, category, unit, current_unit_price, unit_price, reorder_level, description) VALUES
    ('Bread White 500g', 'SKU-006-BREAD', 'Bakery', 'pack', 95.00, 95.00, 40, 'White bread loaf 500g pack') ON CONFLICT DO NOTHING;
INSERT INTO products (name, sku, category, unit, current_unit_price, unit_price, reorder_level, description) VALUES
    ('Banana Fresh', 'SKU-007-BANANA', 'Fruits', 'dozen', 180.00, 180.00, 30, 'Fresh banana per dozen') ON CONFLICT DO NOTHING;
INSERT INTO products (name, sku, category, unit, current_unit_price, unit_price, reorder_level, description) VALUES
    ('Orange Fresh', 'SKU-008-ORANGE', 'Fruits', 'kg', 220.00, 220.00, 20, 'Fresh oranges per kg') ON CONFLICT DO NOTHING;

-- Insert Notification Templates
INSERT INTO notification_templates (template_key, title_template, message_template, notification_type) VALUES
    ('LOW_STOCK_ALERT', 'Low Stock Alert', 'Product {{product_name}} in {{location}} is below reorder level ({{current_stock}}/{{reorder_level}})', 'WARNING') ON CONFLICT DO NOTHING;
INSERT INTO notification_templates (template_key, title_template, message_template, notification_type) VALUES
    ('STOCK_REQUEST_APPROVED', 'Stock Request Approved', 'Your stock request for {{product_name}} ({{qty}} units) has been approved', 'INFO') ON CONFLICT DO NOTHING;
INSERT INTO notification_templates (template_key, title_template, message_template, notification_type) VALUES
    ('DELIVERY_IN_TRANSIT', 'Delivery In Transit', 'Delivery {{tracking_number}} is now in transit to {{destination}}', 'INFO') ON CONFLICT DO NOTHING;
INSERT INTO notification_templates (template_key, title_template, message_template, notification_type) VALUES
    ('DELIVERY_DELIVERED', 'Delivery Received', 'Delivery {{tracking_number}} has been delivered at {{destination}}', 'INFO') ON CONFLICT DO NOTHING;
INSERT INTO notification_templates (template_key, title_template, message_template, notification_type) VALUES
    ('BATCH_EXPIRY_ALERT', 'Batch Expiry Alert', 'Batch {{batch_number}} of {{product_name}} expires on {{expiry_date}}', 'CRITICAL') ON CONFLICT DO NOTHING;
INSERT INTO notification_templates (template_key, title_template, message_template, notification_type) VALUES
    ('GRN_RECEIVED', 'GRN Confirmed', 'Goods received note {{grn_ref}} has been confirmed. Inventory updated.', 'INFO') ON CONFLICT DO NOTHING;
INSERT INTO notification_templates (template_key, title_template, message_template, notification_type) VALUES
    ('FORECAST_ALERT', 'Forecast Alert', 'Product {{product_name}} forecast suggests {{predicted_demand}} units needed by {{forecast_date}}', 'INFO') ON CONFLICT DO NOTHING;
INSERT INTO notification_templates (template_key, title_template, message_template, notification_type) VALUES
    ('DISCREPANCY_FOUND', 'Delivery Discrepancy', 'Discrepancy found in delivery {{tracking_number}}: {{variance}} units variance', 'WARNING') ON CONFLICT DO NOTHING;

-- Create initial Admin user (password: admin123 - must be changed on first login)
-- Password hash for 'admin123' using bcrypt (you'll compute this during user creation)
-- For now, we'll use a placeholder - actual implementation will hash in Java
INSERT INTO users (username, password_hash, email, full_name, is_active, warehouse_id, supermarket_id) VALUES
    ('admin', '$2a$10$placeholder_hash_admin123', 'admin@wsms.lk', 'System Administrator', TRUE, NULL, NULL) ON CONFLICT DO NOTHING;

-- Assign ADMIN role to admin user
INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id FROM users u, roles r 
WHERE u.username = 'admin' AND r.role_name = 'ADMIN' ON CONFLICT DO NOTHING;

-- Create sample warehouse manager user
INSERT INTO users (username, password_hash, email, full_name, is_active, warehouse_id, supermarket_id) VALUES
    ('warehouse_mgr_colombo', '$2a$10$placeholder_hash_warehouse', 'mgr.colombo@wsms.lk', 'Warehouse Manager Colombo', TRUE, 1, NULL) ON CONFLICT DO NOTHING;

-- Assign WAREHOUSE_MANAGER role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'warehouse_mgr_colombo' AND r.role_name = 'WAREHOUSE_MANAGER' ON CONFLICT DO NOTHING;

-- Create sample warehouse staff user
INSERT INTO users (username, password_hash, email, full_name, is_active, warehouse_id, supermarket_id) VALUES
    ('warehouse_staff_colombo', '$2a$10$placeholder_hash_staff', 'staff.colombo@wsms.lk', 'Warehouse Staff Member', TRUE, 1, NULL) ON CONFLICT DO NOTHING;

-- Assign WAREHOUSE_STAFF role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'warehouse_staff_colombo' AND r.role_name = 'WAREHOUSE_STAFF' ON CONFLICT DO NOTHING;

-- Create sample supermarket manager users
INSERT INTO users (username, password_hash, email, full_name, is_active, warehouse_id, supermarket_id) VALUES
    ('supermarket_mgr_fm_colombo', '$2a$10$placeholder_hash_supermarket', 'mgr.fm.colombo@wsms.lk', 'Store Manager - Fresh Mart Colombo', TRUE, NULL, 1) ON CONFLICT DO NOTHING;
INSERT INTO users (username, password_hash, email, full_name, is_active, warehouse_id, supermarket_id) VALUES
    ('supermarket_mgr_ms_colombo', '$2a$10$placeholder_hash_supermarket', 'mgr.ms.colombo@wsms.lk', 'Store Manager - Metro Store Colombo', TRUE, NULL, 4) ON CONFLICT DO NOTHING;

-- Assign SUPERMARKET_MANAGER role to supermarket managers
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username LIKE 'supermarket_mgr_%' AND r.role_name = 'SUPERMARKET_MANAGER' ON CONFLICT DO NOTHING;

-- Initialize inventory levels for all products
INSERT INTO inventory (product_id, warehouse_id, supermarket_id, quantity, reorder_level) VALUES
    ((SELECT id FROM products WHERE sku = 'SKU-001-RICE'), (SELECT id FROM warehouses WHERE code = 'WH-COL-001'), NULL, 150, 20) ON CONFLICT DO NOTHING;
INSERT INTO inventory (product_id, warehouse_id, supermarket_id, quantity, reorder_level) VALUES
    ((SELECT id FROM products WHERE sku = 'SKU-002-OIL'), (SELECT id FROM warehouses WHERE code = 'WH-COL-001'), NULL, 200, 30) ON CONFLICT DO NOTHING;
INSERT INTO inventory (product_id, warehouse_id, supermarket_id, quantity, reorder_level) VALUES
    ((SELECT id FROM products WHERE sku = 'SKU-003-CHICKEN'), (SELECT id FROM warehouses WHERE code = 'WH-COL-001'), NULL, 80, 10) ON CONFLICT DO NOTHING;
INSERT INTO inventory (product_id, warehouse_id, supermarket_id, quantity, reorder_level) VALUES
    ((SELECT id FROM products WHERE sku = 'SKU-004-TOMATO'), (SELECT id FROM warehouses WHERE code = 'WH-COL-001'), NULL, 300, 50) ON CONFLICT DO NOTHING;
INSERT INTO inventory (product_id, warehouse_id, supermarket_id, quantity, reorder_level) VALUES
    ((SELECT id FROM products WHERE sku = 'SKU-005-MILK'), (SELECT id FROM warehouses WHERE code = 'WH-COL-001'), NULL, 120, 25) ON CONFLICT DO NOTHING;
INSERT INTO inventory (product_id, warehouse_id, supermarket_id, quantity, reorder_level) VALUES
    ((SELECT id FROM products WHERE sku = 'SKU-006-BREAD'), (SELECT id FROM warehouses WHERE code = 'WH-COL-001'), NULL, 250, 40) ON CONFLICT DO NOTHING;
INSERT INTO inventory (product_id, warehouse_id, supermarket_id, quantity, reorder_level) VALUES
    ((SELECT id FROM products WHERE sku = 'SKU-007-BANANA'), (SELECT id FROM warehouses WHERE code = 'WH-COL-001'), NULL, 180, 30) ON CONFLICT DO NOTHING;
INSERT INTO inventory (product_id, warehouse_id, supermarket_id, quantity, reorder_level) VALUES
    ((SELECT id FROM products WHERE sku = 'SKU-008-ORANGE'), (SELECT id FROM warehouses WHERE code = 'WH-COL-001'), NULL, 100, 20) ON CONFLICT DO NOTHING;

INSERT INTO inventory (product_id, warehouse_id, supermarket_id, quantity, reorder_level) VALUES
    ((SELECT id FROM products WHERE sku = 'SKU-001-RICE'), NULL, (SELECT id FROM supermarkets WHERE code = 'SM-COL-001'), 35, 20) ON CONFLICT DO NOTHING;
INSERT INTO inventory (product_id, warehouse_id, supermarket_id, quantity, reorder_level) VALUES
    ((SELECT id FROM products WHERE sku = 'SKU-002-OIL'), NULL, (SELECT id FROM supermarkets WHERE code = 'SM-COL-001'), 45, 30) ON CONFLICT DO NOTHING;
INSERT INTO inventory (product_id, warehouse_id, supermarket_id, quantity, reorder_level) VALUES
    ((SELECT id FROM products WHERE sku = 'SKU-003-CHICKEN'), NULL, (SELECT id FROM supermarkets WHERE code = 'SM-COL-001'), 15, 10) ON CONFLICT DO NOTHING;
INSERT INTO inventory (product_id, warehouse_id, supermarket_id, quantity, reorder_level) VALUES
    ((SELECT id FROM products WHERE sku = 'SKU-004-TOMATO'), NULL, (SELECT id FROM supermarkets WHERE code = 'SM-COL-001'), 75, 50) ON CONFLICT DO NOTHING;
INSERT INTO inventory (product_id, warehouse_id, supermarket_id, quantity, reorder_level) VALUES
    ((SELECT id FROM products WHERE sku = 'SKU-005-MILK'), NULL, (SELECT id FROM supermarkets WHERE code = 'SM-COL-001'), 25, 25) ON CONFLICT DO NOTHING;
INSERT INTO inventory (product_id, warehouse_id, supermarket_id, quantity, reorder_level) VALUES
    ((SELECT id FROM products WHERE sku = 'SKU-006-BREAD'), NULL, (SELECT id FROM supermarkets WHERE code = 'SM-COL-001'), 60, 40) ON CONFLICT DO NOTHING;
INSERT INTO inventory (product_id, warehouse_id, supermarket_id, quantity, reorder_level) VALUES
    ((SELECT id FROM products WHERE sku = 'SKU-007-BANANA'), NULL, (SELECT id FROM supermarkets WHERE code = 'SM-COL-001'), 40, 30) ON CONFLICT DO NOTHING;
INSERT INTO inventory (product_id, warehouse_id, supermarket_id, quantity, reorder_level) VALUES
    ((SELECT id FROM products WHERE sku = 'SKU-008-ORANGE'), NULL, (SELECT id FROM supermarkets WHERE code = 'SM-COL-001'), 20, 20) ON CONFLICT DO NOTHING;

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details TEXT;

-- Log initial data creation
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at) VALUES
    (NULL, 'SYSTEM_INIT', 'SYSTEM', 0, 'Initial data migration V5 completed', CURRENT_TIMESTAMP);
