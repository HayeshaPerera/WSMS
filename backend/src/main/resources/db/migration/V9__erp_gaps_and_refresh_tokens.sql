-- ============================================================
-- V5: ERP Schema Gaps + Refresh Tokens
-- Bridges existing schema to master prompt requirements
-- ============================================================

-- 1. Refresh Tokens Table (JWT refresh token store)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT      NOT NULL,
    token       VARCHAR(512) NOT NULL UNIQUE,
    expiry_date TIMESTAMP   NOT NULL,
    revoked     BOOLEAN     DEFAULT FALSE,
    created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_refresh_token_token  ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_token_user   ON refresh_tokens(user_id);

-- 2. demand_forecast: add Prophet confidence bounds
ALTER TABLE demand_forecast
    ADD COLUMN IF NOT EXISTS lower_bound   DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS upper_bound   DECIMAL(12,2);

-- 3. notifications: add navigation link column
ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS link VARCHAR(255);

-- 4. grn_headers: add reference_number (supplier PO reference)
ALTER TABLE grn_headers
    ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100);

-- 5. sales_history: add recorded_by FK (with safe constraint handling)
ALTER TABLE sales_history
    ADD COLUMN IF NOT EXISTS recorded_by BIGINT;

-- Add constraint only if it doesn't already exist
DO $$ 
BEGIN
    IF NOT EXISTS(
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name='sales_history' AND constraint_name='fk_sales_recorded_by'
    ) THEN
        ALTER TABLE sales_history
            ADD CONSTRAINT fk_sales_recorded_by
            FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 6. Soft-delete (is_deleted) on tables not already covered by V2 deleted_at
--    V2 added deleted_at to: products, warehouses, supermarkets, users, inventory
--    Add is_deleted flag to remaining tables for consistent query filtering
ALTER TABLE stock_requests  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE deliveries       ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE delivery_items   ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE grn_headers      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE grn_items        ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE sales_history    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE demand_forecast  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE audit_logs       ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE roles            ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- 7. Partial indexes for is_deleted filtering performance
CREATE INDEX IF NOT EXISTS idx_stock_requests_active  ON stock_requests(id)  WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_deliveries_active      ON deliveries(id)      WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_grn_headers_active     ON grn_headers(id)     WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_active   ON notifications(user_id, is_read) WHERE is_deleted = FALSE;

-- 8. stock_requests: add urgency alias column (master prompt uses urgency, schema uses priority)
--    Keep priority for backward compat, add urgency as a computed synonym via default
ALTER TABLE stock_requests ADD COLUMN IF NOT EXISTS urgency VARCHAR(30);
-- Back-fill urgency from existing priority column
UPDATE stock_requests SET urgency = priority WHERE urgency IS NULL;

-- 9. deliveries: add failure tracking columns
ALTER TABLE deliveries
    ADD COLUMN IF NOT EXISTS failed_at       TIMESTAMP,
    ADD COLUMN IF NOT EXISTS failure_reason  VARCHAR(500);

-- 10. Updated timestamps trigger function (reusable)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables that have updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'products','warehouses','supermarkets','users','inventory',
        'stock_requests','deliveries','grn_headers','demand_forecast'
    ]
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger
            WHERE tgname = 'trg_' || t || '_updated_at'
        ) THEN
            EXECUTE format(
                'CREATE TRIGGER trg_%I_updated_at
                 BEFORE UPDATE ON %I
                 FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
                t, t
            );
        END IF;
    END LOOP;
END;
$$;
