# Warehouse and Supermarket Supply Chain Management System (WSSCMS)

End-to-end Angular + Spring Boot + PostgreSQL system with JWT auth, role-based access (Admin, Warehouse Staff, Supermarket Manager), inventory sync, stock requests, deliveries, and AI-assisted demand forecasting. Dockerized and ready for AWS.

## Stack
- Frontend: Angular 17, Chart.js, black/yellow/white theme
- Backend: Spring Boot 3, Spring Security (JWT), JPA/Hibernate, Apache Commons Math (forecasting)
- Database: PostgreSQL
- Container: Docker, docker-compose

## Quick Start (local)
```bash
# from repo root
docker-compose up --build
```
- Frontend: http://localhost:4200
- Backend: http://localhost:8080
- DB: localhost:5432 (wsscms_db / wsscms_user / wsscms_password)

### Without Docker
```bash
# backend
cd backend
./mvnw spring-boot:run

# frontend
cd ../frontend
npm install
npm start
```

## Auth
Default users (password `password123`):
- admin (ROLE_ADMIN)
- warehouse1, warehouse2 (ROLE_WAREHOUSE_STAFF)
- supermarket1, supermarket2, supermarket3 (ROLE_SUPERMARKET_MANAGER)

## API Base
- Auth: /api/auth/login
- Inventory: /api/inventory
- Stock Requests: /api/stock-requests
- Deliveries: /api/deliveries
- Forecasts: /api/forecast
- Products: /api/products
- Warehouses: /api/warehouses
- Supermarkets: /api/supermarkets
- Users: /api/users
- Sales: /api/sales

See [API.md](API.md) for detailed endpoint documentation with request/response examples.

## Database Seed
`database/schema.sql` creates schema, roles, sample users, products, inventory, sales history, stock requests, and deliveries.

## Docker/AWS Notes
- Set `jwt.secret` or `JWT_SECRET` to a strong value in production.
- Configure CORS via `cors.allowed.origins` env or property.
- For AWS ECS/EKS: build images, push to ECR, deploy compose or k8s manifests. Ensure Postgres storage persistence.
- See [AWS_DEPLOY.md](AWS_DEPLOY.md) for complete deployment guide with RDS, ECS, ALB, and security checklist.

## Frontend Theming
Black primary background, yellow accents, white text (see `src/styles.css`). Responsive tables and dashboards. Role-aware nav and guards.

## Forecasting
Uses 90-day weighted moving average + linear regression trend + seasonal factor to produce weekly/monthly predictions and recommended orders.

## Testing
- Backend: `mvn test`
- Frontend: `npm test`

## Notes
- Response targets: sub-3s typical on modest data sizes; enable DB indexes already defined.
- Real-time sync hooks implemented via service methods; for production, add websockets if needed.
