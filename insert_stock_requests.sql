-- Insert 4 hardcoded stock requests to match what the user saw earlier

-- REQ-2026-001 (Organic Whole Milk)
INSERT INTO stock_requests (
    request_number, supermarket_id, warehouse_id, product_id, 
    requested_quantity, requested_qty, status, priority, urgency, 
    requested_by, requested_at, created_at, updated_at
) VALUES (
    'REQ-2026-001', 1, 1, 1, 
    100, 100, 'PENDING', 'MEDIUM', 'MEDIUM', 
    (SELECT id FROM users WHERE username = 'supermarket1' LIMIT 1), '2026-02-03 10:00:00', NOW(), NOW()
);

-- REQ-2026-002 (Premium Ground Coffee)
INSERT INTO stock_requests (
    request_number, supermarket_id, warehouse_id, product_id, 
    requested_quantity, requested_qty, status, priority, urgency, 
    requested_by, requested_at, created_at, updated_at
) VALUES (
    'REQ-2026-002', 1, 1, 3, 
    50, 50, 'PENDING', 'HIGH', 'HIGH', 
    (SELECT id FROM users WHERE username = 'supermarket1' LIMIT 1), '2026-02-04 10:00:00', NOW(), NOW()
);

-- REQ-2026-003 (Eggs (Dozen))
INSERT INTO stock_requests (
    request_number, supermarket_id, warehouse_id, product_id, 
    requested_quantity, requested_qty, approved_quantity, approved_qty, status, priority, urgency, 
    requested_by, approved_by, requested_at, approved_at, approval_date, created_at, updated_at
) VALUES (
    'REQ-2026-003', 1, 1, 6, 
    200, 200, 200, 200, 'APPROVED', 'MEDIUM', 'MEDIUM', 
    (SELECT id FROM users WHERE username = 'supermarket1' LIMIT 1), 
    (SELECT id FROM users WHERE username = 'warehouse1' LIMIT 1), 
    '2026-02-01 10:00:00', '2026-02-02 10:00:00', '2026-02-02 10:00:00', NOW(), NOW()
);

-- REQ-2026-004 (Chicken Breast (1kg))
INSERT INTO stock_requests (
    request_number, supermarket_id, warehouse_id, product_id, 
    requested_quantity, requested_qty, status, priority, urgency, 
    requested_by, requested_at, created_at, updated_at
) VALUES (
    'REQ-2026-004', 1, 1, 5, 
    75, 75, 'PENDING', 'URGENT', 'URGENT', 
    (SELECT id FROM users WHERE username = 'supermarket1' LIMIT 1), '2026-02-05 10:00:00', NOW(), NOW()
);
