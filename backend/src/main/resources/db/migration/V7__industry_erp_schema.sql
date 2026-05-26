-- ============================================================
-- V4: Industry ERP extensions
-- Adds support for multi-item deliveries and Goods Received Notes
-- ============================================================

-- 1. Modify deliveries to drop single-item columns if they exist
ALTER TABLE deliveries
DROP COLUMN IF EXISTS product_id,
DROP COLUMN IF EXISTS quantity;

-- 2. Delivery Items Table
CREATE TABLE IF NOT EXISTS delivery_items (
    id BIGSERIAL PRIMARY KEY,
    delivery_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    expected_quantity INTEGER NOT NULL,
    actual_quantity INTEGER,
    status VARCHAR(50) DEFAULT 'PENDING',
    notes VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- 3. GRN Headers (Goods Received Note) Table
CREATE TABLE IF NOT EXISTS grn_headers (
    id BIGSERIAL PRIMARY KEY,
    grn_number VARCHAR(50) NOT NULL UNIQUE,
    warehouse_id BIGINT NOT NULL,
    supplier_name VARCHAR(150),
    received_by BIGINT NOT NULL,
    status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, COMPLETED, CANCELLED
    notes TEXT,
    received_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
    FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- 4. GRN Items Table
CREATE TABLE IF NOT EXISTS grn_items (
    id BIGSERIAL PRIMARY KEY,
    grn_header_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10, 2),
    batch_number VARCHAR(50),
    expiry_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grn_header_id) REFERENCES grn_headers(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- Note: Other tables (audit_logs, notifications, demand_forecast, sales_history)
-- were already defined in V1__baseline_schema.sql
