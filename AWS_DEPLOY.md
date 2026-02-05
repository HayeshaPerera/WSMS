# AWS Deployment Guide

## Prerequisites
- Docker installed locally
- AWS CLI configured with appropriate credentials
- ECR repository created (or use docker-compose for local testing)

## Production Environment Variables

### Backend (`application.properties` or environment)
```properties
spring.datasource.url=jdbc:postgresql://your-rds-endpoint:5432/wsscms_db
spring.datasource.username=${DB_USER}
spring.datasource.password=${DB_PASSWORD}
jwt.secret=${JWT_SECRET}
jwt.expiration=86400000
cors.allowed.origins=${CORS_ORIGINS:http://localhost:4200}
```

### Frontend (environment.prod.ts)
```typescript
export const environment = {
  production: true,
  apiBase: '/api'  // or your API Gateway/ALB endpoint
};
```

## Docker Build & Deploy

### 1. Build Images
```bash
# Backend
cd backend
docker build -t wsscms-backend:latest .

# Frontend
cd ../frontend
docker build -t wsscms-frontend:latest .
```

### 2. Tag & Push to ECR
```bash
# Authenticate
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Tag
docker tag wsscms-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/wsscms-backend:latest
docker tag wsscms-frontend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/wsscms-frontend:latest

# Push
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/wsscms-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/wsscms-frontend:latest
```

### 3. Run with docker-compose (local or EC2)
```bash
# Edit docker-compose.yml environment variables
docker-compose up -d
```

## AWS Infrastructure (Manual Setup)

### RDS PostgreSQL
1. Create RDS PostgreSQL 14+ instance
2. Set security group to allow backend container access
3. Run `database/schema.sql` to initialize schema and seed data

### ECS/Fargate (Recommended)
1. Create ECS cluster
2. Define task definitions:
   - Backend: 512MB CPU, 1GB RAM, port 8080, environment vars (JWT_SECRET, DB_URL, DB_USER, DB_PASSWORD, CORS_ORIGINS)
   - Frontend: 256MB CPU, 512MB RAM, port 80
3. Create Application Load Balancer:
   - Frontend target group → port 80
   - Backend target group → port 8080
   - Path rules: `/api/*` → backend, `/*` → frontend
4. Create ECS services for backend and frontend tasks

### Environment Variables (ECS Task Definition)
**Backend:**
```json
{
  "name": "JWT_SECRET",
  "value": "<strong-256-bit-secret>"
},
{
  "name": "DB_URL",
  "value": "jdbc:postgresql://wsscms-db.abc123.us-east-1.rds.amazonaws.com:5432/wsscms_db"
},
{
  "name": "DB_USER",
  "valueFrom": "arn:aws:secretsmanager:us-east-1:123456:secret:wsscms/db-user"
},
{
  "name": "DB_PASSWORD",
  "valueFrom": "arn:aws:secretsmanager:us-east-1:123456:secret:wsscms/db-password"
},
{
  "name": "CORS_ORIGINS",
  "value": "https://your-frontend-domain.com"
}
```

**Frontend (if needed):**
```json
{
  "name": "API_BASE",
  "value": "/api"
}
```

## CORS Configuration

Update `SecurityConfig.java`:
```java
@Value("${cors.allowed.origins:http://localhost:4200}")
private String[] allowedOrigins;

@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOrigins(Arrays.asList(allowedOrigins.split(",")));
    // ... rest
}
```

Set `CORS_ORIGINS` environment variable to production frontend domain.

## Health Checks
- Backend: `GET /actuator/health` (add spring-boot-starter-actuator if needed)
- Frontend: `GET /` (Angular serves index.html)

## Scaling
- ECS: Auto-scale on CPU/memory
- RDS: Increase instance size or enable read replicas if needed
- ALB: Automatically scales

## Monitoring
- CloudWatch Logs: Enable log groups for ECS tasks
- CloudWatch Metrics: Track CPU, memory, request count
- X-Ray: Add Java/Node agents for distributed tracing

## Security Checklist
- ✅ JWT secret 256+ bits, unique per environment
- ✅ DB credentials in AWS Secrets Manager
- ✅ HTTPS only via ALB
- ✅ Security groups: DB only accessible from backend, ALB only from internet
- ✅ IAM roles: ECS task execution role with minimal permissions
- ✅ Update `application.properties` to disable dev features in prod

## Database Migration
Use Flyway or Liquibase for versioned migrations in production. Current `schema.sql` is for initial setup only.
