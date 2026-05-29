# Warehouse and Supermarket Supply Chain Management System (WSSCMS)

A web-based supply chain management system developed using Angular, Spring Boot, and PostgreSQL to manage warehouse and supermarket operations efficiently. The system supports secure JWT authentication, role-based access control, inventory synchronization, stock request handling, delivery management, and AI-assisted demand forecasting. The application is containerized using Docker and designed to be scalable for future expansion.

---

# Technology Stack

## Frontend

* Angular 17
* TypeScript
* Chart.js
* Responsive UI Design

## Backend

* Spring Boot 3
* Spring Security with JWT Authentication
* Spring Data JPA / Hibernate
* Apache Commons Math for forecasting

## Database

* PostgreSQL

## DevOps & Deployment

* Docker
* Docker Compose
* AWS Deployment Ready

---

# Core Features

* JWT-based Authentication & Authorization
* Role-Based Access Control

  * Admin
  * Warehouse Staff
  * Supermarket Manager
* Inventory Management
* Stock Request Management
* Delivery Tracking
* Inventory Synchronization
* AI-Assisted Demand Forecasting
* Responsive Dashboard & Reports
* Sales Data Management

---

# System Scope

The current implementation supports:

* One warehouse
* One supermarket

However, the system architecture is designed to be expandable and scalable to support multiple warehouses and supermarkets in future development stages.

---

# Quick Start (Docker)

```bash
docker-compose up --build
```

## Services

* Frontend: http://localhost:4200
* Backend: http://localhost:8080
* Database: PostgreSQL on port 5432

---

# Running Without Docker

## Backend

```bash
cd backend
./mvnw spring-boot:run
```

## Frontend

```bash
cd frontend
npm install
npm start
```

---

# Authentication

## Default Users

| Username     | Role                     |
| ------------ | ------------------------ |
| admin        | ROLE_ADMIN               |
| warehouse1   | ROLE_WAREHOUSE_STAFF     |
| supermarket1 | ROLE_SUPERMARKET_MANAGER |

Default Password:

```text
password
```

---

# API Modules

| Module         | Endpoint            |
| -------------- | ------------------- |
| Authentication | /api/auth/login     |
| Inventory      | /api/inventory      |
| Stock Requests | /api/stock-requests |
| Deliveries     | /api/deliveries     |
| Forecasting    | /api/forecast       |
| Products       | /api/products       |
| Warehouses     | /api/warehouses     |
| Supermarkets   | /api/supermarkets   |
| Users          | /api/users          |
| Sales          | /api/sales          |

Detailed API documentation is available in `API.md`.

---

# Database Initialization

The `database/schema.sql` file initializes:

* Database schema
* User roles
* Sample users
* Products
* Inventory records
* Sales history
* Stock requests
* Delivery records

---

# AI Forecasting Module

The forecasting module uses:

* Weighted Moving Average (90-day)
* Linear Regression Trend Analysis
* Seasonal Factor Calculations

The system generates:

* Weekly demand predictions
* Monthly demand forecasts
* Recommended stock order quantities

---

# AWS Deployment

The system is deployment-ready for AWS using:

* Amazon ECS/EKS
* Amazon RDS (PostgreSQL)
* Elastic Load Balancer (ALB)
* Docker Containers

## Production Recommendations

* Configure strong JWT secrets
* Enable PostgreSQL persistence
* Configure CORS securely

Deployment details are available in `AWS_DEPLOY.md`.

---

# Testing

## Backend Testing

```bash
mvn test
```

## Frontend Testing

```bash
npm test
```

---

# Performance Notes

* Optimized database indexing is enabled
* Typical API response time is under 3 seconds
* Designed for scalable inventory synchronization
* Real-time sync hooks are implemented and can be extended using WebSockets for production environments

---

# Frontend Theme

The application UI follows a:

* White primary background
* Green accent colors
* Clean and responsive layout

Responsive dashboards, tables, and navigation are implemented for all user roles.

---

# Future Improvements

* Multi-warehouse support
* Multi-supermarket support
* Real-time notifications using WebSockets
* Advanced AI forecasting models
* Mobile application support
* QR/barcode integration

---
