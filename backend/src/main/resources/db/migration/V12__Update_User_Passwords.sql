-- Update all users to have the password 'password'
UPDATE users SET password_hash = '$2a$10$8.UnVuG9HLROJOsIpi1I.eVGExjcK7c15qF.iJzD0U9s.z31U1aM2';

-- Add a user 'warehouse1' since the frontend or user expects it
INSERT INTO users (username, password_hash, email, full_name, is_active, warehouse_id, supermarket_id)
VALUES ('warehouse1', '$2a$10$8.UnVuG9HLROJOsIpi1I.eVGExjcK7c15qF.iJzD0U9s.z31U1aM2', 'warehouse1@wsms.lk', 'Warehouse 1 User', TRUE, 1, NULL)
ON CONFLICT (username) DO UPDATE SET password_hash = '$2a$10$8.UnVuG9HLROJOsIpi1I.eVGExjcK7c15qF.iJzD0U9s.z31U1aM2';

-- Assign WAREHOUSE_MANAGER role to warehouse1
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'warehouse1' AND r.role_name = 'WAREHOUSE_MANAGER'
ON CONFLICT DO NOTHING;
