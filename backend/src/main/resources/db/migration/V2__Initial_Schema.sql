-- V1: Core Schema - Users, Roles, Audit Base
-- All tables have: id, created_at, updated_at, is_deleted

CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE warehouses (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    capacity DECIMAL(12, 2) NOT NULL,
    manager_name VARCHAR(255),
    contact_phone VARCHAR(20),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE supermarkets (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    branch_code VARCHAR(50) NOT NULL UNIQUE,
    location VARCHAR(255) NOT NULL,
    manager_name VARCHAR(255),
    contact_phone VARCHAR(20),
    email VARCHAR(255),
    par_level_setting DECIMAL(5, 2) DEFAULT 1.2,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(500) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    warehouse_id BIGINT REFERENCES warehouses(id) ON DELETE SET NULL,
    supermarket_id BIGINT REFERENCES supermarkets(id) ON DELETE SET NULL,
    last_login TIMESTAMP,
    phone_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE user_roles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, role_id)
);

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id BIGINT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_warehouse ON users(warehouse_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_users_supermarket ON users(supermarket_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_user_roles_user ON user_roles(user_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at) WHERE is_deleted = FALSE;
