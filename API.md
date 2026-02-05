# API Reference

Base URL (local): `http://localhost:8080`

## Authentication

### POST /api/auth/login
Login and receive JWT token.

**Request:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1...",
  "type": "Bearer",
  "username": "admin",
  "email": "admin@wsscms.com",
  "roles": ["ROLE_ADMIN"],
  "userId": 1
}
```

**Headers:** Include `Authorization: Bearer <token>` in all subsequent requests.

---

## Inventory

### GET /api/inventory
Get all inventory records.

### GET /api/inventory/{id}
Get inventory by ID.

### GET /api/inventory/warehouse/{warehouseId}
Get inventory for a warehouse.

### GET /api/inventory/supermarket/{supermarketId}
Get inventory for a supermarket.

### GET /api/inventory/low-stock
Get all low-stock items (quantity <= reorder level).

### POST /api/inventory
Create new inventory record.

**Request:**
```json
{
  "productId": 1,
  "warehouseId": 1,
  "quantity": 500,
  "reorderLevel": 100
}
```

### PUT /api/inventory/{id}
Update inventory record.

### DELETE /api/inventory/{id}
Delete inventory record.

---

## Stock Requests

### GET /api/stock-requests
Get all stock requests.

### GET /api/stock-requests/{id}
Get stock request by ID.

### GET /api/stock-requests/supermarket/{supermarketId}
Get requests for a supermarket.

### GET /api/stock-requests/warehouse/{warehouseId}
Get requests assigned to a warehouse.

### GET /api/stock-requests/pending
Get all pending requests.

### POST /api/stock-requests
Create new stock request.

**Request:**
```json
{
  "supermarketId": 1,
  "warehouseId": 1,
  "productId": 2,
  "requestedQuantity": 50,
  "priority": "HIGH",
  "requestedById": 3
}
```

### PUT /api/stock-requests/{id}/approve
Approve a stock request.

**Request:**
```json
{
  "approvedQuantity": 50,
  "approvedById": 2
}
```

### PUT /api/stock-requests/{id}/reject
Reject a stock request.

**Request:**
```json
{
  "reason": "Insufficient stock",
  "rejectedById": 2
}
```

### GET /api/stock-requests/count/pending
Get count of pending requests.

---

## Deliveries

### GET /api/deliveries
Get all deliveries.

### GET /api/deliveries/{id}
Get delivery by ID.

### GET /api/deliveries/tracking/{trackingNumber}
Track delivery by tracking number.

### GET /api/deliveries/warehouse/{warehouseId}
Get deliveries from a warehouse.

### GET /api/deliveries/supermarket/{supermarketId}
Get deliveries to a supermarket.

### GET /api/deliveries/active
Get active (in-transit, dispatched) deliveries.

### POST /api/deliveries
Create new delivery.

**Request:**
```json
{
  "stockRequestId": 1,
  "warehouseId": 1,
  "supermarketId": 1,
  "productId": 2,
  "quantity": 50
}
```

### PUT /api/deliveries/{id}/dispatch
Dispatch a delivery.

**Request:**
```json
{
  "driverName": "John Doe",
  "vehicleNumber": "XYZ-1234"
}
```

### PUT /api/deliveries/{id}/status
Update delivery status.

**Request:**
```json
{
  "status": "IN_TRANSIT",
  "location": "Highway 101"
}
```

### PUT /api/deliveries/{id}/receive
Mark delivery as received.

**Request:**
```json
{
  "receivedById": 3
}
```

### GET /api/deliveries/count/active
Get count of active deliveries.

---

## Forecasting

### GET /api/forecast/all
Get demand forecasts for all products.

**Response:**
```json
[
  {
    "productId": 1,
    "productName": "Organic Milk",
    "productSku": "DAIRY-001",
    "predictedWeeklyDemand": 120.5,
    "predictedMonthlyDemand": 482.0,
    "confidence": 0.85,
    "forecastMethod": "WEIGHTED_MOVING_AVERAGE",
    "historicalAverage": 115.2,
    "currentStock": 200,
    "recommendedOrder": 300,
    "trend": "INCREASING"
  }
]
```

### GET /api/forecast/product/{productId}
Get forecast for a specific product.

### GET /api/forecast/supermarket/{supermarketId}
Get forecasts for products in a supermarket.

---

## Products

### GET /api/products
Get all products.

### GET /api/products/{id}
Get product by ID.

### POST /api/products
Create new product (Admin only).

**Request:**
```json
{
  "sku": "DAIRY-999",
  "name": "Premium Cheese",
  "category": "Dairy",
  "unitPrice": 8.99,
  "reorderLevel": 50,
  "minStockLevel": 20,
  "perishable": true,
  "shelfLifeDays": 30
}
```

### PUT /api/products/{id}
Update product (Admin only).

### DELETE /api/products/{id}
Delete product (Admin only).

---

## Warehouses

### GET /api/warehouses
Get all warehouses.

### GET /api/warehouses/{id}
Get warehouse by ID.

### POST /api/warehouses
Create new warehouse (Admin only).

### PUT /api/warehouses/{id}
Update warehouse (Admin only).

### DELETE /api/warehouses/{id}
Delete warehouse (Admin only).

---

## Supermarkets

### GET /api/supermarkets
Get all supermarkets.

### GET /api/supermarkets/{id}
Get supermarket by ID.

### POST /api/supermarkets
Create new supermarket (Admin only).

### PUT /api/supermarkets/{id}
Update supermarket (Admin only).

### DELETE /api/supermarkets/{id}
Delete supermarket (Admin only).

---

## Users

### GET /api/users
Get all users (Admin only).

### GET /api/users/{id}
Get user by ID (Admin only).

---

## Sales History

### POST /api/sales
Record a sale.

**Request:**
```json
{
  "productId": 1,
  "supermarketId": 1,
  "quantitySold": 10,
  "unitPrice": 3.99
}
```

### GET /api/sales/supermarket/{supermarketId}
Get sales history for a supermarket.

### GET /api/sales/product/{productId}
Get sales history for a product.

---

## Error Responses

All errors return:
```json
{
  "success": false,
  "message": "Error description"
}
```

Common status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized (invalid/missing token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 500: Internal Server Error

---

## Role-Based Access

- **ROLE_ADMIN:** Full access to all endpoints
- **ROLE_WAREHOUSE_STAFF:** Inventory, stock requests (approve/reject), deliveries (dispatch/update)
- **ROLE_SUPERMARKET_MANAGER:** Inventory (read), stock requests (create), deliveries (receive), forecasts (read)

---

## Notes

- All timestamps are in ISO 8601 format (UTC).
- Forecasting runs daily and caches results; forecasts are based on 90 days of sales history.
- Stock request approval automatically creates a delivery record.
- Delivery status flow: PENDING → DISPATCHED → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED.
