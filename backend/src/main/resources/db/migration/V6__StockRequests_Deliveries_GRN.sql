-- V3: Stock Requests, Deliveries, GRN (Goods Received Notes)

CREATE TABLE IF NOT EXISTS stock_requests (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    supermarket_id BIGINT NOT NULL REFERENCES supermarkets(id) ON DELETE RESTRICT,
    warehouse_id BIGINT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    requested_qty INT NOT NULL,
    approved_qty INT,
    rejected_qty INT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    urgency VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    notes TEXT,
    requested_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    approved_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    rejected_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    approval_date TIMESTAMP,
    rejection_date TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Deliveries: Shipments from warehouse to supermarket
CREATE TABLE IF NOT EXISTS deliveries (
    id BIGSERIAL PRIMARY KEY,
    stock_request_id BIGINT REFERENCES stock_requests(id) ON DELETE SET NULL,
    warehouse_id BIGINT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    supermarket_id BIGINT NOT NULL REFERENCES supermarkets(id) ON DELETE RESTRICT,
    tracking_number VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'PREPARING',
    driver_name VARCHAR(255),
    vehicle_number VARCHAR(50),
    contact_phone VARCHAR(20),
    dispatched_at TIMESTAMP,
    in_transit_at TIMESTAMP,
    delivered_at TIMESTAMP,
    dispatch_notes TEXT,
    delivery_notes TEXT,
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    received_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Delivery items: Individual products in a delivery
CREATE TABLE IF NOT EXISTS delivery_items (
    id BIGSERIAL PRIMARY KEY,
    delivery_id BIGINT NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    batch_number VARCHAR(100),
    dispatched_qty INT NOT NULL,
    received_qty INT,
    discrepancy_notes TEXT,
    received_at TIMESTAMP,
    investigation_status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- GRN Header: Goods Received from Suppliers
CREATE TABLE IF NOT EXISTS grn_headers (
    id BIGSERIAL PRIMARY KEY,
    warehouse_id BIGINT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    supplier_name VARCHAR(255) NOT NULL,
    supplier_id BIGINT,
    reference_number VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    invoice_number VARCHAR(100),
    invoice_date DATE,
    invoice_amount DECIMAL(12, 2),
    received_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    confirmed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    confirmation_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- GRN Items: Products received in a GRN
CREATE TABLE IF NOT EXISTS grn_items (
    id BIGSERIAL PRIMARY KEY,
    grn_header_id BIGINT NOT NULL REFERENCES grn_headers(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    ordered_qty INT NOT NULL,
    received_qty INT NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    batch_number VARCHAR(100),
    expiry_date DATE,
    manufacture_date DATE,
    discrepancy_notes TEXT,
    quality_status VARCHAR(50) DEFAULT 'ACCEPTED',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Delivery discrepancy investigation log
CREATE TABLE delivery_discrepancies (
    id BIGSERIAL PRIMARY KEY,
    delivery_item_id BIGINT NOT NULL REFERENCES delivery_items(id) ON DELETE CASCADE,
    quantity_variance INT NOT NULL,
    variance_reason VARCHAR(255),
    investigation_notes TEXT,
    investigated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    investigated_at TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE,
    resolution_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX idx_stock_requests_status ON stock_requests(status) WHERE is_deleted = FALSE;
CREATE INDEX idx_stock_requests_supermarket ON stock_requests(supermarket_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_stock_requests_warehouse ON stock_requests(warehouse_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_stock_requests_urgency ON stock_requests(urgency) WHERE is_deleted = FALSE;
CREATE INDEX idx_deliveries_status ON deliveries(status) WHERE is_deleted = FALSE;
CREATE INDEX idx_deliveries_warehouse ON deliveries(warehouse_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_deliveries_supermarket ON deliveries(supermarket_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_deliveries_tracking ON deliveries(tracking_number);
CREATE INDEX idx_delivery_items_delivery ON delivery_items(delivery_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_grn_headers_warehouse ON grn_headers(warehouse_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_grn_headers_status ON grn_headers(status) WHERE is_deleted = FALSE;
CREATE INDEX idx_grn_items_grn ON grn_items(grn_header_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_discrepancies_delivery_item ON delivery_discrepancies(delivery_item_id) WHERE is_deleted = FALSE;
