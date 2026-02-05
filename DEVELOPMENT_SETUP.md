# WSSCMS - Running Frontend and Backend Separately

## Quick Start

### Option 1: Run Frontend and Backend in Separate Terminals (Recommended)

#### Windows:
```powershell
# Terminal 1 - Backend
.\run-backend.bat

# Terminal 2 - Frontend
.\run-frontend.bat
```

#### macOS/Linux:
```bash
# Terminal 1 - Backend
./run-backend.sh

# Terminal 2 - Frontend
./run-frontend.sh
```

### Option 2: Run Both Automatically (One Command)

#### Windows:
```powershell
.\run-both.bat
```

#### macOS/Linux:
```bash
./run-both.sh
```

---

## Manual Setup

### Backend (Spring Boot) - Port 8080

#### Prerequisites:
- Java 17+ installed
- Maven installed
- PostgreSQL 14+ running on `localhost:5432`
- Database `wsscms_db` created

#### Starting Backend:
```bash
cd backend
mvn clean spring-boot:run
```

**Backend will start at:** http://localhost:8080
**API Endpoints:** http://localhost:8080/api/**
**Health Check:** http://localhost:8080/actuator/health

#### Backend Configuration:
Located in: `backend/src/main/resources/application.properties`
- Server Port: 8080
- Database URL: jdbc:postgresql://localhost:5432/wsscms_db
- Database User: wsscms_user
- Database Password: wsscms_password
- CORS Origin: http://localhost:4200

---

### Frontend (Angular) - Port 4200

#### Prerequisites:
- Node.js 18+ installed
- npm installed (comes with Node.js)

#### Starting Frontend:
```bash
cd frontend
npm install
npm start
```

**Frontend will start at:** http://localhost:4200

#### Frontend Configuration:
Located in: `frontend/src/environments/environment.ts`
```typescript
export const environment = {
  production: false,
  apiBase: 'http://localhost:8080'
};
```

---

## Database Setup (PostgreSQL)

### Create Database:
```sql
CREATE DATABASE wsscms_db;
CREATE USER wsscms_user WITH PASSWORD 'wsscms_password';
ALTER ROLE wsscms_user SET client_encoding TO 'utf8';
ALTER ROLE wsscms_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE wsscms_user SET default_transaction_deferrable TO on;
ALTER ROLE wsscms_user SET default_time_zone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE wsscms_db TO wsscms_user;
```

### Verify Connection:
```bash
psql -h localhost -U wsscms_user -d wsscms_db
```

---

## API Documentation

Once backend is running, access Swagger UI:
- **URL:** http://localhost:8080/swagger-ui.html
- **API Docs:** http://localhost:8080/v3/api-docs

---

## Troubleshooting

### Backend won't start

1. **Check if port 8080 is in use:**
   ```bash
   # Windows
   netstat -ano | findstr :8080
   
   # macOS/Linux
   lsof -i :8080
   ```

2. **Check database connection:**
   - Verify PostgreSQL is running
   - Test connection: `psql -h localhost -U wsscms_user -d wsscms_db`
   - Check credentials in `application.properties`

3. **Build issues:**
   ```bash
   cd backend
   mvn clean install
   mvn spring-boot:run
   ```

### Frontend won't start

1. **Check if port 4200 is in use:**
   ```bash
   # Windows
   netstat -ano | findstr :4200
   
   # macOS/Linux
   lsof -i :4200
   ```

2. **Clear node_modules and reinstall:**
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   npm start
   ```

3. **Angular CLI issues:**
   ```bash
   npm install -g @angular/cli@latest
   ```

### Connection refused errors

Make sure backend is fully started before opening frontend. You should see:
```
Tomcat started on port(s): 8080 (http)
```

---

## Development Workflow

1. **Start Backend:** `./run-backend.bat` (or .sh)
2. **Start Frontend:** `./run-frontend.bat` (or .sh)
3. **Open Browser:** http://localhost:4200
4. **Make changes:** Code will auto-reload in both frontend and backend
5. **Check API:** http://localhost:8080/api/**

---

## Common Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 4200 | http://localhost:4200 |
| Backend API | 8080 | http://localhost:8080 |
| PostgreSQL | 5432 | localhost:5432 |
| Swagger UI | 8080 | http://localhost:8080/swagger-ui.html |

---

## Environment Variables (Optional)

Create `.env` file in backend root:
```properties
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/wsscms_db
SPRING_DATASOURCE_USERNAME=wsscms_user
SPRING_DATASOURCE_PASSWORD=wsscms_password
SERVER_PORT=8080
```

---

## Docker Alternative (Compose)

If you prefer Docker:
```bash
docker-compose up -d
```

This will start:
- PostgreSQL on port 5432
- Backend on port 8080
- Frontend on port 8081 (in container, mapped to 4200)

---

## Next Steps

1. Open http://localhost:4200 in your browser
2. Login with demo credentials (configured in backend)
3. Explore the application
4. Start developing!

For more info, see:
- Backend README: `backend/README.md`
- Frontend README: `frontend/README.md`
- API Documentation: http://localhost:8080/swagger-ui.html
