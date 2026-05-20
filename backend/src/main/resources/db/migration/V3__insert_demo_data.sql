-- Insert roles first
INSERT INTO roles (id, role_name) VALUES (1, 'ROLE_ADMIN') ON CONFLICT DO NOTHING;
INSERT INTO roles (id, role_name) VALUES (2, 'ROLE_WAREHOUSE_STAFF') ON CONFLICT DO NOTHING;
INSERT INTO roles (id, role_name) VALUES (3, 'ROLE_SUPERMARKET_MANAGER') ON CONFLICT DO NOTHING;

-- Insert users (no first_name/last_name columns)
INSERT INTO users (id, username, password_hash, email, full_name, is_active)
VALUES (1, 'admin', '$2b$10$2ZGTcGTjMAnoKkZSiSsdYOCMu7coNPenYHNNFK09UeSggISdTTqZu', 'admin@wsscms.com', 'System Admin', true)
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (id, username, password_hash, email, full_name, is_active)
VALUES (2, 'warehouse1', '$2b$10$2ZGTcGTjMAnoKkZSiSsdYOCMu7coNPenYHNNFK09UeSggISdTTqZu', 'warehouse@wsscms.com', 'Warehouse Staff', true)
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (id, username, password_hash, email, full_name, is_active)
VALUES (3, 'manager1', '$2b$10$2ZGTcGTjMAnoKkZSiSsdYOCMu7coNPenYHNNFK09UeSggISdTTqZu', 'manager@wsscms.com', 'Supermarket Manager', true)
ON CONFLICT (username) DO NOTHING;

-- Assign roles to users
INSERT INTO user_roles (user_id, role_id) VALUES (1, 1) ON CONFLICT DO NOTHING;
INSERT INTO user_roles (user_id, role_id) VALUES (2, 2) ON CONFLICT DO NOTHING;
INSERT INTO user_roles (user_id, role_id) VALUES (3, 3) ON CONFLICT DO NOTHING;