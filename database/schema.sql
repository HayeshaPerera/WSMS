-- Database Schema for Warehouse and Supermarket Supply Chain Management System
-- PostgreSQL Database: wsscms_db

-- Create database (run as superuser)
-- CREATE DATABASE wsscms_db;
-- CREATE USER wsscms_user WITH PASSWORD 'wsscms_password';
-- GRANT ALL PRIVILEGES ON DATABASE wsscms_db TO wsscms_user;

-- Connect to wsscms_db before running the following

-- Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(200),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Warehouses Table
CREATE TABLE IF NOT EXISTS warehouses (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200) NOT NULL,
    address VARCHAR(200),
    capacity INTEGER NOT NULL,
    current_stock INTEGER DEFAULT 0,
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Supermarkets Table
CREATE TABLE IF NOT EXISTS supermarkets (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200) NOT NULL,
    address VARCHAR(200),
    storage_capacity INTEGER NOT NULL,
    current_stock INTEGER DEFAULT 0,
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    assigned_warehouse_id BIGINT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    warehouse_id BIGINT,
    supermarket_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL,
    FOREIGN KEY (supermarket_id) REFERENCES supermarkets(id) ON DELETE SET NULL
);

-- User Roles Junction Table
CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    sku VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description VARCHAR(500),
    category VARCHAR(100) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    reorder_level INTEGER DEFAULT 50,
    min_stock_level INTEGER DEFAULT 20,
    unit VARCHAR(50),
    brand VARCHAR(100),
    is_perishable BOOLEAN DEFAULT FALSE,
    shelf_life_days INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    warehouse_id BIGINT,
    supermarket_id BIGINT,
    quantity INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 50,
    batch_number VARCHAR(50),
    manufacture_date DATE,
    expiry_date DATE,
    location VARCHAR(100),
    last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    low_stock_alert BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    FOREIGN KEY (supermarket_id) REFERENCES supermarkets(id) ON DELETE CASCADE,
    CHECK (
        (warehouse_id IS NOT NULL AND supermarket_id IS NULL) OR 
        (warehouse_id IS NULL AND supermarket_id IS NOT NULL)
    )
);

CREATE INDEX idx_inventory_product_warehouse ON inventory(product_id, warehouse_id);
CREATE INDEX idx_inventory_low_stock ON inventory(quantity, reorder_level);

-- Stock Requests Table
CREATE TABLE IF NOT EXISTS stock_requests (
    id BIGSERIAL PRIMARY KEY,
    request_number VARCHAR(50) NOT NULL UNIQUE,
    supermarket_id BIGINT NOT NULL,
    warehouse_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    requested_quantity INTEGER NOT NULL,
    approved_quantity INTEGER,
    status VARCHAR(30) NOT NULL,
    priority VARCHAR(30) NOT NULL,
    requested_by BIGINT NOT NULL,
    approved_by BIGINT,
    notes VARCHAR(500),
    rejection_reason VARCHAR(500),
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    completed_at TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supermarket_id) REFERENCES supermarkets(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Deliveries Table
CREATE TABLE IF NOT EXISTS deliveries (
    id BIGSERIAL PRIMARY KEY,
    tracking_number VARCHAR(50) NOT NULL UNIQUE,
    stock_request_id BIGINT NOT NULL,
    warehouse_id BIGINT NOT NULL,
    supermarket_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INTEGER NOT NULL,
    status VARCHAR(30) NOT NULL,
    driver_name VARCHAR(100),
    vehicle_number VARCHAR(20),
    current_location VARCHAR(500),
    notes VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dispatched_at TIMESTAMP,
    in_transit_at TIMESTAMP,
    delivered_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estimated_delivery TIMESTAMP,
    received_by BIGINT,
    FOREIGN KEY (stock_request_id) REFERENCES stock_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    FOREIGN KEY (supermarket_id) REFERENCES supermarkets(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Sales History Table
CREATE TABLE IF NOT EXISTS sales_history (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    supermarket_id BIGINT NOT NULL,
    sale_date DATE NOT NULL,
    quantity_sold INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    notes VARCHAR(200),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (supermarket_id) REFERENCES supermarkets(id) ON DELETE CASCADE
);

CREATE INDEX idx_sales_date ON sales_history(sale_date);
CREATE INDEX idx_sales_product ON sales_history(product_id, sale_date);

-- Insert Default Roles
INSERT INTO roles (role_name, description) VALUES
('ROLE_ADMIN', 'System Administrator with full access'),
('ROLE_WAREHOUSE_STAFF', 'Warehouse staff managing inventory and deliveries'),
('ROLE_SUPERMARKET_MANAGER', 'Supermarket manager handling stock requests')
ON CONFLICT (role_name) DO NOTHING;

-- Insert Sample Warehouses
INSERT INTO warehouses (code, name, location, address, capacity, current_stock, contact_phone, contact_email) VALUES
('WH001', 'Central Warehouse', 'Downtown District', '123 Main Street, City Center', 100000, 0, '+1-555-0101', 'central@warehouse.com'),
('WH002', 'North Warehouse', 'North Industrial Zone', '456 North Avenue, Industrial Area', 75000, 0, '+1-555-0102', 'north@warehouse.com'),
('WH003', 'South Warehouse', 'South Port Area', '789 Harbor Road, Port District', 80000, 0, '+1-555-0103', 'south@warehouse.com')
ON CONFLICT (code) DO NOTHING;

-- Insert Sample Supermarkets
INSERT INTO supermarkets (code, name, location, address, storage_capacity, assigned_warehouse_id, contact_phone, contact_email) VALUES
('SM001', 'MegaMart Downtown', 'City Center', '100 Shopping Plaza, Downtown', 5000, 1, '+1-555-0201', 'downtown@megamart.com'),
('SM002', 'MegaMart North', 'North Residential', '200 Residential Street, North Side', 4000, 2, '+1-555-0202', 'north@megamart.com'),
('SM003', 'MegaMart East', 'East Business District', '300 Business Avenue, East Zone', 4500, 1, '+1-555-0203', 'east@megamart.com'),
('SM004', 'MegaMart West', 'West Suburb', '400 Suburb Lane, West Area', 3500, 3, '+1-555-0204', 'west@megamart.com'),
('SM005', 'MegaMart South', 'South Residential', '500 Community Road, South District', 4000, 3, '+1-555-0205', 'south@megamart.com')
ON CONFLICT (code) DO NOTHING;

-- Insert Sample Users (Password: password - BCrypt encrypted)
-- BCrypt hash for 'password': $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
-- All users now have password: 'password' (BCrypt hash: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy)
INSERT INTO users (username, password_hash, email, full_name, phone_number, warehouse_id, supermarket_id) VALUES
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin@wsscms.com', 'System Administrator', '+1-555-1001', NULL, NULL),
('warehouse1', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'wh1@wsscms.com', 'John Warehouse', '+1-555-1002', 1, NULL),
('warehouse2', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'wh2@wsscms.com', 'Jane Storage', '+1-555-1003', 2, NULL),
('supermarket1', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'sm1@wsscms.com', 'Mike Manager', '+1-555-1004', NULL, 1),
('supermarket2', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'sm2@wsscms.com', 'Sarah Supervisor', '+1-555-1005', NULL, 2),
('supermarket3', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'sm3@wsscms.com', 'Tom Trader', '+1-555-1006', NULL, 3)
ON CONFLICT (username) DO NOTHING;

-- Assign Roles to Users
INSERT INTO user_roles (user_id, role_id) VALUES
(1, 1), -- admin -> ROLE_ADMIN
(2, 2), -- warehouse1 -> ROLE_WAREHOUSE_STAFF
(3, 2), -- warehouse2 -> ROLE_WAREHOUSE_STAFF
(4, 3), -- supermarket1 -> ROLE_SUPERMARKET_MANAGER
(5, 3), -- supermarket2 -> ROLE_SUPERMARKET_MANAGER
(6, 3)  -- supermarket3 -> ROLE_SUPERMARKET_MANAGER
ON CONFLICT DO NOTHING;

-- Insert Sample Products
INSERT INTO products (sku, name, description, category, unit_price, reorder_level, min_stock_level, unit, brand, is_perishable, shelf_life_days) VALUES
('PROD001', 'Organic Whole Milk', 'Fresh organic whole milk 1 gallon', 'Dairy', 4.99, 100, 30, 'gallon', 'FarmFresh', TRUE, 14),
('PROD002', 'White Bread Loaf', 'Freshly baked white bread', 'Bakery', 2.49, 150, 50, 'loaf', 'BakersBest', TRUE, 7),
('PROD003', 'Premium Ground Coffee', 'Arabica ground coffee 1lb', 'Beverages', 12.99, 80, 20, 'lb', 'MorningBrew', FALSE, 365),
('PROD004', 'Cheddar Cheese Block', 'Aged cheddar cheese 8oz', 'Dairy', 5.99, 70, 20, '8oz', 'CheeseWorld', TRUE, 60),
('PROD005', 'Chicken Breast', 'Fresh chicken breast per lb', 'Meat', 6.99, 120, 40, 'lb', 'FreshPoultry', TRUE, 5),
('PROD006', 'Brown Rice', 'Long grain brown rice 2lb bag', 'Grains', 3.99, 100, 30, '2lb', 'GrainFields', FALSE, 730),
('PROD007', 'Olive Oil', 'Extra virgin olive oil 16oz', 'Cooking Oil', 8.99, 60, 15, '16oz', 'Mediterranean', FALSE, 540),
('PROD008', 'Orange Juice', 'Fresh squeezed orange juice 64oz', 'Beverages', 5.49, 90, 25, '64oz', 'CitrusPure', TRUE, 10),
('PROD009', 'Whole Wheat Pasta', 'Whole wheat penne pasta 16oz', 'Pasta', 2.99, 110, 30, '16oz', 'PastaRoma', FALSE, 720),
('PROD010', 'Greek Yogurt', 'Plain greek yogurt 32oz', 'Dairy', 4.49, 80, 25, '32oz', 'GreekGood', TRUE, 21),
('PROD011', 'Fresh Bananas', 'Ripe bananas per lb', 'Produce', 0.59, 200, 50, 'lb', 'TropicalFresh', TRUE, 7),
('PROD012', 'Canned Tomatoes', 'Diced tomatoes 14.5oz can', 'Canned Goods', 1.29, 150, 40, '14.5oz', 'TomatoKing', FALSE, 1095),
('PROD013', 'Frozen Pizza', 'Pepperoni frozen pizza 12inch', 'Frozen Foods', 7.99, 70, 20, '12inch', 'PizzaMania', TRUE, 180),
('PROD014', 'Breakfast Cereal', 'Whole grain cereal 18oz', 'Breakfast', 4.99, 90, 25, '18oz', 'MorningCrunch', FALSE, 270),
('PROD015', 'Bottled Water', 'Purified water 24-pack 16oz', 'Beverages', 5.99, 200, 60, '24-pack', 'PureSpring', FALSE, 730)
ON CONFLICT (sku) DO NOTHING;

-- Insert Sample Inventory for Warehouses
INSERT INTO inventory (product_id, warehouse_id, supermarket_id, quantity, reorder_level, batch_number, manufacture_date, location) VALUES
(1, 1, NULL, 500, 100, 'BATCH-2026-001', '2026-01-15', 'A-1-01'),
(2, 1, NULL, 800, 150, 'BATCH-2026-002', '2026-01-20', 'A-2-01'),
(3, 1, NULL, 300, 80, 'BATCH-2025-101', '2025-12-01', 'B-1-05'),
(4, 1, NULL, 400, 70, 'BATCH-2026-003', '2026-01-10', 'A-3-02'),
(5, 1, NULL, 600, 120, 'BATCH-2026-004', '2026-01-22', 'C-1-01'),
(6, 2, NULL, 450, 100, 'BATCH-2025-201', '2025-11-15', 'D-1-03'),
(7, 2, NULL, 280, 60, 'BATCH-2025-202', '2025-10-20', 'E-2-01'),
(8, 2, NULL, 520, 90, 'BATCH-2026-005', '2026-01-18', 'A-4-01'),
(9, 2, NULL, 600, 110, 'BATCH-2025-203', '2025-11-01', 'B-2-03'),
(10, 2, NULL, 380, 80, 'BATCH-2026-006', '2026-01-12', 'A-5-02'),
(11, 3, NULL, 1000, 200, 'BATCH-2026-007', '2026-01-21', 'F-1-01'),
(12, 3, NULL, 850, 150, 'BATCH-2025-301', '2025-09-15', 'G-1-02'),
(13, 3, NULL, 350, 70, 'BATCH-2025-302', '2025-12-10', 'H-1-01'),
(14, 3, NULL, 480, 90, 'BATCH-2026-008', '2026-01-05', 'B-3-04'),
(15, 3, NULL, 1200, 200, 'BATCH-2026-009', '2026-01-10', 'I-1-01')
ON CONFLICT DO NOTHING;

-- Insert Sample Inventory for Supermarkets
INSERT INTO inventory (product_id, warehouse_id, supermarket_id, quantity, reorder_level, batch_number, manufacture_date, location) VALUES
(1, NULL, 1, 45, 50, 'BATCH-2026-001', '2026-01-15', 'Dairy-A1'),
(2, NULL, 1, 120, 75, 'BATCH-2026-002', '2026-01-20', 'Bakery-B2'),
(3, NULL, 1, 35, 40, 'BATCH-2025-101', '2025-12-01', 'Beverage-C1'),
(4, NULL, 1, 55, 35, 'BATCH-2026-003', '2026-01-10', 'Dairy-A2'),
(5, NULL, 1, 80, 60, 'BATCH-2026-004', '2026-01-22', 'Meat-D1'),
(6, NULL, 2, 70, 50, 'BATCH-2025-201', '2025-11-15', 'Grains-E1'),
(7, NULL, 2, 40, 30, 'BATCH-2025-202', '2025-10-20', 'Oil-F1'),
(8, NULL, 2, 65, 45, 'BATCH-2026-005', '2026-01-18', 'Beverage-C2'),
(9, NULL, 2, 85, 55, 'BATCH-2025-203', '2025-11-01', 'Pasta-G1'),
(10, NULL, 2, 50, 40, 'BATCH-2026-006', '2026-01-12', 'Dairy-A3'),
(11, NULL, 3, 150, 100, 'BATCH-2026-007', '2026-01-21', 'Produce-H1'),
(12, NULL, 3, 95, 75, 'BATCH-2025-301', '2025-09-15', 'Canned-I1'),
(13, NULL, 3, 42, 35, 'BATCH-2025-302', '2025-12-10', 'Frozen-J1'),
(14, NULL, 3, 60, 45, 'BATCH-2026-008', '2026-01-05', 'Cereal-K1'),
(15, NULL, 3, 180, 100, 'BATCH-2026-009', '2026-01-10', 'Beverage-C3')
ON CONFLICT DO NOTHING;

-- Insert Sample Sales History (90 days of historical data)
INSERT INTO sales_history (product_id, supermarket_id, sale_date, quantity_sold, unit_price, total_amount) 
SELECT 
    p.id,
    s.id,
    CURRENT_DATE - (random() * 90)::INTEGER,
    (random() * 50 + 10)::INTEGER,
    p.unit_price,
    p.unit_price * (random() * 50 + 10)::INTEGER
FROM products p
CROSS JOIN supermarkets s
WHERE p.id <= 15 AND s.id <= 5
LIMIT 300;

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id BIGINT,
    user_id BIGINT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_date ON audit_logs(created_at);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    related_entity_type VARCHAR(100),
    related_entity_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_date ON notifications(created_at);

-- Demand Forecast Table
CREATE TABLE IF NOT EXISTS demand_forecast (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    supermarket_id BIGINT NOT NULL,
    forecast_date DATE NOT NULL,
    predicted_demand DECIMAL(12, 2) NOT NULL,
    actual_demand INTEGER,
    confidence_level DECIMAL(5, 4),
    algorithm VARCHAR(50),
    model_version VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (supermarket_id) REFERENCES supermarkets(id) ON DELETE CASCADE
);

CREATE INDEX idx_forecast_product ON demand_forecast(product_id, forecast_date);
CREATE INDEX idx_forecast_supermarket ON demand_forecast(supermarket_id, forecast_date);

-- Insert Sample Stock Requests
INSERT INTO stock_requests (request_number, supermarket_id, warehouse_id, product_id, requested_quantity, status, priority, requested_by, notes) VALUES
('REQ-00000001', 1, 1, 1, 100, 'PENDING', 'HIGH', 4, 'Running low on milk, high demand expected'),
('REQ-00000002', 2, 2, 6, 80, 'APPROVED', 'MEDIUM', 5, 'Regular restock'),
('REQ-00000003', 3, 3, 11, 150, 'IN_TRANSIT', 'URGENT', 6, 'Fresh produce needed urgently'),
('REQ-00000004', 1, 1, 5, 120, 'PENDING', 'HIGH', 4, 'Chicken stock running low'),
('REQ-00000005', 4, 3, 15, 200, 'APPROVED', 'MEDIUM', 4, 'Water restock for summer')
ON CONFLICT (request_number) DO NOTHING;

-- Update approved stock requests
UPDATE stock_requests SET approved_quantity = requested_quantity, approved_by = 2, approved_at = CURRENT_TIMESTAMP WHERE status = 'APPROVED';

-- Insert Sample Deliveries
INSERT INTO deliveries (tracking_number, stock_request_id, warehouse_id, supermarket_id, product_id, quantity, status, driver_name, vehicle_number, current_location, estimated_delivery) VALUES
('TRK-0000000001', 3, 3, 3, 11, 150, 'IN_TRANSIT', 'Robert Driver', 'DEL-123', 'En route to destination', CURRENT_TIMESTAMP + INTERVAL '3 hours'),
('TRK-0000000002', 2, 2, 2, 6, 80, 'DELIVERED', 'Linda Trucker', 'DEL-456', 'MegaMart North', CURRENT_TIMESTAMP - INTERVAL '2 days')
ON CONFLICT (tracking_number) DO NOTHING;

-- Update delivered delivery
UPDATE deliveries SET delivered_at = CURRENT_TIMESTAMP - INTERVAL '2 days', received_by = 5 WHERE tracking_number = 'TRK-0000000002';

COMMIT;
