-- V2: Products, Price History, Inventory, Batch Tracking

CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL,
    unit_type VARCHAR(50) NOT NULL,
    current_unit_price DECIMAL(12, 2) NOT NULL,
    reorder_level INT NOT NULL DEFAULT 10,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    supplier_id BIGINT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Track all price changes for audit trail
CREATE TABLE price_history (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    old_price DECIMAL(12, 2) NOT NULL,
    new_price DECIMAL(12, 2) NOT NULL,
    change_reason VARCHAR(255),
    changed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Batch tracking for expiry management and traceability
CREATE TABLE batch_tracking (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    expiry_date DATE NOT NULL,
    manufacture_date DATE,
    quantity_received INT NOT NULL,
    quantity_on_hand INT NOT NULL,
    warehouse_id BIGINT REFERENCES warehouses(id) ON DELETE SET NULL,
    supermarket_id BIGINT REFERENCES supermarkets(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    UNIQUE(product_id, batch_number, warehouse_id, supermarket_id)
);

-- Inventory with warehouse and supermarket level tracking
CREATE TABLE inventory (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id BIGINT REFERENCES warehouses(id) ON DELETE CASCADE,
    supermarket_id BIGINT REFERENCES supermarkets(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 0,
    reorder_level INT NOT NULL,
    last_counted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    UNIQUE(product_id, warehouse_id, supermarket_id),
    CHECK ((warehouse_id IS NOT NULL AND supermarket_id IS NULL) OR 
           (warehouse_id IS NULL AND supermarket_id IS NOT NULL))
);

-- Inventory transaction log - ALL stock movements logged here
CREATE TABLE inventory_transactions (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id BIGINT REFERENCES warehouses(id) ON DELETE SET NULL,
    supermarket_id BIGINT REFERENCES supermarkets(id) ON DELETE SET NULL,
    transaction_type VARCHAR(50) NOT NULL,
    quantity_change INT NOT NULL,
    reason VARCHAR(100) NOT NULL,
    reference_type VARCHAR(50),
    reference_id BIGINT,
    batch_number VARCHAR(100),
    recorded_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Inventory reconciliation (physical count vs system)
CREATE TABLE inventory_reconciliation (
    id BIGSERIAL PRIMARY KEY,
    warehouse_id BIGINT REFERENCES warehouses(id) ON DELETE CASCADE,
    supermarket_id BIGINT REFERENCES supermarkets(id) ON DELETE CASCADE,
    reconciliation_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'DRAFT',
    total_discrepancy_count INT DEFAULT 0,
    reconciled_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    reconciled_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE reconciliation_items (
    id BIGSERIAL PRIMARY KEY,
    reconciliation_id BIGINT NOT NULL REFERENCES inventory_reconciliation(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    system_quantity INT NOT NULL,
    physical_count INT NOT NULL,
    variance INT NOT NULL,
    adjustment_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category) WHERE is_deleted = FALSE;
CREATE INDEX idx_price_history_product ON price_history(product_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_batch_tracking_expiry ON batch_tracking(expiry_date) WHERE is_deleted = FALSE;
CREATE INDEX idx_batch_tracking_warehouse ON batch_tracking(warehouse_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_batch_tracking_supermarket ON batch_tracking(supermarket_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_inventory_product ON inventory(product_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_inventory_warehouse ON inventory(warehouse_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_inventory_supermarket ON inventory(supermarket_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_inventory_transactions_product ON inventory_transactions(product_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_inventory_transactions_reference ON inventory_transactions(reference_type, reference_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_inventory_transactions_created ON inventory_transactions(created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX idx_reconciliation_status ON inventory_reconciliation(status) WHERE is_deleted = FALSE;
