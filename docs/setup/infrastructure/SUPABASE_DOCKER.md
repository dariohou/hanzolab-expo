# Supabase Docker Setup for VPS

## Quick Start

```bash
# Navigate to infrastructure directory
cd infrastructure/supabase/docker

# Copy environment file
cp .env.example .env

# Edit .env with your settings (see environment variables section)

# Start Supabase
docker-compose up -d

# Check status
docker-compose ps
```

---

## Docker Compose Configuration

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: supabase/postgres:15.6.0.147
    container_name: supabase-db
    environment:
      POSTGRES_DB: postgres
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_HOST_AUTH_METHOD: trust
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init/scripts:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  kong:
    image: kong:3.4
    container_name: supabase-kong
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /var/lib/kong/kong.yml
      KONG_PROXY_LISTEN: 0.0.0.0:8000
      KONG_ADMIN_LISTEN: 0.0.0.0:8001
    volumes:
      - ./config/kong.yml:/var/lib/kong/kong.yml:ro
    ports:
      - "8000:8000"   # HTTP
      - "8443:8443"   # HTTPS
      - "8001:8001"   # Admin
    depends_on:
      - postgres
    healthcheck:
      test: ["CMD", "kong", "health"]
      interval: 10s
      timeout: 5s
      retries: 5

  auth:
    image: supabase/gotrue:v2.151.0
    container_name: supabase-auth
    environment:
      GOTRUE_DB_DRIVER: postgres
      GOTRUE_DB_DATABASE_URL: postgres://postgres:${POSTGRES_PASSWORD}@postgres:5432/postgres?search_path=auth
      GOTRUE_SITE_URL: ${SITE_URL}
      GOTRUE_URI_ALLOW_LIST: ${ADDITIONAL_REDIRECT_URLS}
      GOTRUE_DISABLE_SIGNUP: "false"
      GOTRUE_JWT_ADMIN_ROLES: service_role
      GOTRUE_JWT_AUD: authenticated
      GOTRUE_JWT_DEFAULT_GROUP: authenticated
      GOTRUE_JWT_SECRET: ${JWT_SECRET}
      GOTRUE_JWT_EXP: 3600
      GOTRUE_EXTERNAL_EMAIL_ENABLED: "true"
      GOTRUE_MAILER_AUTOCONFIRM: "true"
      GOTRUE_SMTP_ADMIN_EMAIL: ${SMTP_ADMIN_EMAIL}
      GOTRUE_SMTP_HOST: ${SMTP_HOST}
      GOTRUE_SMTP_PORT: ${SMTP_PORT}
      GOTRUE_SMTP_USER: ${SMTP_USER}
      GOTRUE_SMTP_PASSWORD: ${SMTP_PASSWORD}
      GOTRUE_SMTP_SENDER_NAME: ${SMTP_SENDER_NAME}
    volumes:
      - ./config/gotrue.env:/etc/gotrue.env:ro
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:9999/health"]
      interval: 10s
      timeout: 5s
      retries: 5

  storage:
    image: supabase/storage-api:v1.11.0
    container_name: supabase-storage
    environment:
      ANON_KEY: ${ANON_KEY}
      SERVICE_KEY: ${SERVICE_KEY}
      POSTGREST_URL: http://rest:3000
      DATABASE_URL: postgres://postgres:${POSTGRES_PASSWORD}@postgres:5432/postgres
      FILE_SIZE_LIMIT: 52428800
      STORAGE_BACKEND: filesystem
      FILE_STORAGE_BACKEND_PATH: /var/lib/storage
      TENANT_ID: stub
      REGION: stub
      GLOBAL_S3_BUCKET: stub
    volumes:
      - storage_data:/var/lib/storage
    depends_on:
      postgres:
        condition: service_healthy

  rest:
    image: postgrest/postgrest:v12.0.2
    container_name: supabase-rest
    environment:
      PGRST_DB_URI: postgres://postgres:${POSTGRES_PASSWORD}@postgres:5432/postgres
      PGRST_DB_SCHEMAS: public, storage
      PGRST_DB_ANON_ROLE: anon
      PGREST_JWT_SECRET: ${JWT_SECRET}
    depends_on:
      postgres:
        condition: service_healthy

  functions:
    image: supabase/edge-runtime:v1.22.0
    container_name: supabase-functions
    environment:
      JWT_SECRET: ${JWT_SECRET}
      SUPABASE_URL: ${SITE_URL}
      SUPABASE_ANON_KEY: ${ANON_KEY}
      SUPABASE_SERVICE_KEY: ${SERVICE_KEY}
      FUNCTIONS_KEY: ${FUNCTIONS_KEY}
    depends_on:
      - rest

  meta:
    image: supabase/postgres-meta:v0.80.0
    container_name: supabase-meta
    environment:
      PG_META_DB_HOST: postgres
      PG_META_DB_PORT: 5432
      PG_META_DB_NAME: postgres
      PG_META_DB_USER: postgres
      PG_META_DB_PASSWORD: ${POSTGRES_PASSWORD}
    depends_on:
      postgres:
        condition: service_healthy

  studio:
    image: supabase/studio:v0.24.0
    container_name: supabase-studio
    environment:
      SUPABASE_URL: ${SITE_URL}
      STUDIO_PG_META_URL: http://meta:8080
      SUPABASE_ANON_KEY: ${ANON_KEY}
      SUPABASE_SERVICE_KEY: ${SERVICE_KEY}
    ports:
      - "3000:3000"
    depends_on:
      - meta

volumes:
  postgres_data:
  storage_data:
```

---

## Environment Variables

Create `.env` file:

```bash
# Domain
SITE_URL=https://your-domain.com
ADDITIONAL_REDIRECT_URLS=https://your-domain.com/**,exp://localhost:8081/**

# PostgreSQL
POSTGRES_PASSWORD=your-super-secret-postgres-password

# JWT (generate with: openssl rand -base64 32)
JWT_SECRET=your-super-secret-jwt-key-with-at-least-32-characters

# API Keys (generate with: openssl rand -base64 24)
ANON_KEY=your-anon-key-for-public-access
SERVICE_KEY=your-service-key-for-admin-access
FUNCTIONS_KEY=your-functions-key

# SMTP (for email sending, optional)
SMTP_ADMIN_EMAIL=admin@your-domain.com
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
SMTP_SENDER_NAME=Your App Name

# Analytics (optional)
# ANALYTICS_ENABLED=false
```

---

## Kong Configuration

Create `config/kong.yml`:

```yaml
_format_version: "3.0"

services:
  - name: auth
    url: http://auth:9999
    routes:
      - name: auth-route
        paths:
          - /auth/v1
        strip_path: true

  - name: rest
    url: http://rest:3000
    routes:
      - name: rest-route
        paths:
          - /rest/v1
        strip_path: true

  - name: storage
    url: http://storage:5000
    routes:
      - name: storage-route
        paths:
          - /storage/v1
        strip_path: true

  - name: meta
    url: http://meta:8080
    routes:
      - name: meta-route
        paths:
          - /meta/v1
        strip_path: true

  - name: functions
    url: http://functions:9000
    routes:
      - name: functions-route
        paths:
          - /functions/v1
        strip_path: true

  - name: studio
    url: http://studio:3000
    routes:
      - name: studio-route
        paths:
          - /studio
        strip_path: true

plugins:
  - name: cors
    config:
      origins:
        - "*"
      methods:
        - GET
        - POST
        - PUT
        - PATCH
        - DELETE
        - OPTIONS
      headers:
        - Accept
        - Accept-Encoding
        - Authorization
        - Content-Type
        - Origin
        - X-Client-Info
        - X-Requested-With
      exposed_headers:
        - X-Total-Count
      credentials: true
      max_age: 3600
```

---

## Database Initialization

Create `init/scripts/001_init.sql`:

```sql
-- Create app-specific databases
CREATE DATABASE qigong_db;
CREATE DATABASE walking_db;
CREATE DATABASE gtg_db;

-- Create extensions
\c postgres
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create auth schema
CREATE SCHEMA IF NOT EXISTS auth;

-- Create storage schema
CREATE SCHEMA IF NOT EXISTS storage;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE qigong_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE walking_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE gtg_db TO postgres;
```

---

## Backup Script

Create `scripts/backup.sh`:

```bash
#!/bin/bash
set -e

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/opt/backups/supabase

mkdir -p $BACKUP_DIR

# Backup each database
for DB in postgres qigong_db walking_db gtg_db; do
  echo "Backing up $DB..."
  docker exec supabase-db-1 pg_dump -U postgres $DB > $BACKUP_DIR/${DB}_${DATE}.sql
done

# Backup storage
docker run --rm \
  -v supabase_storage:/data \
  -v $BACKUP_DIR:/backup \
  alpine \
  tar czf /backup/storage_${DATE}.tar.gz -C /data .

# Clean up old backups (keep last 7 days)
find $BACKUP_DIR -mtime +7 -delete

echo "Backup complete: $DATE"
```

Make executable: `chmod +x scripts/backup.sh`

Add to crontab: `0 2 * * * /opt/supabase/scripts/backup.sh`

---

## Update Procedure

```bash
# Pull latest changes
cd /opt/supabase
git pull

# Update images
docker-compose pull

# Restart services
docker-compose up -d

# Clean up old images
docker image prune -f
```

---

## Monitoring

### Check Container Health

```bash
docker-compose ps
docker-compose logs -f --tail=100
```

### Check Resource Usage

```bash
docker stats
```

### View Specific Service Logs

```bash
docker-compose logs -f postgres
docker-compose logs -f kong
docker-compose logs -f auth
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find what's using port 8000
sudo lsof -i :8000

# Kill it if needed
sudo fuser -k 8000/tcp
```

### Database Connection Failed

```bash
# Check if postgres is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart postgres
docker-compose restart postgres
```

### Storage Permission Issues

```bash
# Fix storage permissions
docker-compose exec storage chmod -R 755 /var/lib/storage
```

---

## Production Checklist

- [ ] Set strong passwords in `.env`
- [ ] Configure firewall (only ports 80, 443)
- [ ] Set up SSL with Let's Encrypt
- [ ] Configure automated backups
- [ ] Set up monitoring/alerting
- [ ] Test restore procedure
- [ ] Update Kong CORS settings for production domains
- [ ] Enable rate limiting in Kong