-- V4: Sales, Forecasting, Notifications

CREATE TABLE IF NOT EXISTS sales_history (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    supermarket_id BIGINT NOT NULL REFERENCES supermarkets(id) ON DELETE RESTRICT,
    sale_date DATE NOT NULL,
    quantity_sold INT NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    discount_percentage DECIMAL(5, 2) DEFAULT 0,
    recorded_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Demand forecast predictions from Prophet ML service
CREATE TABLE IF NOT EXISTS demand_forecasts (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    supermarket_id BIGINT NOT NULL REFERENCES supermarkets(id) ON DELETE CASCADE,
    forecast_date DATE NOT NULL,
    predicted_demand INT NOT NULL,
    lower_bound INT,
    upper_bound INT,
    confidence_level DECIMAL(5, 2),
    algorithm VARCHAR(50) DEFAULT 'PROPHET',
    current_stock INT,
    buffer_quantity INT,
    recommendation VARCHAR(50),
    generated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    UNIQUE(product_id, supermarket_id, forecast_date)
);

-- Notifications: Auto-generated alerts for users
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'INFO',
    entity_type VARCHAR(100),
    entity_id BIGINT,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    link VARCHAR(500),
    priority VARCHAR(50) DEFAULT 'NORMAL',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Notification templates for consistent messaging
CREATE TABLE IF NOT EXISTS notification_templates (
    id BIGSERIAL PRIMARY KEY,
    template_key VARCHAR(100) NOT NULL UNIQUE,
    title_template VARCHAR(255) NOT NULL,
    message_template TEXT NOT NULL,
    notification_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Stock request approval workflow state
CREATE TABLE IF NOT EXISTS approval_workflows (
    id BIGSERIAL PRIMARY KEY,
    stock_request_id BIGINT NOT NULL REFERENCES stock_requests(id) ON DELETE CASCADE,
    current_approver_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    approval_level INT,
    status VARCHAR(50) DEFAULT 'PENDING',
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- System alerts for low stock, expiry dates, etc
CREATE TABLE IF NOT EXISTS system_alerts (
    id BIGSERIAL PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    warehouse_id BIGINT REFERENCES warehouses(id) ON DELETE SET NULL,
    supermarket_id BIGINT REFERENCES supermarkets(id) ON DELETE SET NULL,
    product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
    batch_number VARCHAR(100),
    alert_message TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    resolved_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Bulk sales upload tracking
CREATE TABLE IF NOT EXISTS bulk_upload_logs (
    id BIGSERIAL PRIMARY KEY,
    supermarket_id BIGINT NOT NULL REFERENCES supermarkets(id) ON DELETE CASCADE,
    file_name VARCHAR(255),
    total_records INT,
    successful_records INT,
    failed_records INT,
    error_details TEXT,
    status VARCHAR(50) DEFAULT 'PROCESSING',
    uploaded_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Ensure is_deleted columns exist (for tables that may have been created before this migration)
ALTER TABLE sales_history ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE demand_forecasts ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE notification_templates ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE approval_workflows ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE system_alerts ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE bulk_upload_logs ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sales_history_product ON sales_history(product_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sales_history_supermarket ON sales_history(supermarket_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sales_history_date ON sales_history(sale_date DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_demand_forecasts_product ON demand_forecasts(product_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_demand_forecasts_supermarket ON demand_forecasts(supermarket_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_demand_forecasts_date ON demand_forecasts(forecast_date) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read, user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_system_alerts_type ON system_alerts(alert_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_system_alerts_warehouse ON system_alerts(warehouse_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_system_alerts_supermarket ON system_alerts(supermarket_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_system_alerts_resolved ON system_alerts(is_resolved) WHERE is_deleted = FALSE;
