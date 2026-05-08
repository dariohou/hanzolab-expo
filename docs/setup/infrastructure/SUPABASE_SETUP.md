# VPS Setup Guide - Supabase Self-Hosted

## Overview

This guide covers setting up Supabase on a single VPS using Docker. Estimated monthly cost: **$20-40/month** (DigitalOcean 4GB RAM droplet or Hetzner CX21).

---

## Prerequisites

### Server Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM | 4GB | 8GB |
| CPU | 2 vCPUs | 4 vCPUs |
| Disk | 80GB SSD | 160GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### Software Requirements

- Docker 24+
- Docker Compose v2+
- Nginx (for reverse proxy, optional)
- SSH access to server
- Domain pointed to server (optional, for HTTPS)

---

## Step 1: Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
sudo apt install docker-compose -y

# Add current user to docker group (avoid sudo for docker)
sudo usermod -aG docker $USER

# Install Portainer for Docker management (optional but recommended)
docker volume create portainer_data
docker run -d -p 9000:9000 -p 8000:8000 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

---

## Step 2: DNS Configuration

Point your domain to your server's IP:

```
A    @     YOUR_SERVER_IP
CNAME api   YOUR_SERVER_IP
CNAME *     YOUR_SERVER_IP
```

---

## Step 3: Install Supabase

### Option A: Standard Supabase Docker Deployment

```bash
# Clone Supabase self-hosted
git clone --depth 1 https://github.com/supabase/supabase.git
cd supabase/docker

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Essential Environment Variables

```env
# Site URL (your domain)
SITE_URL=https://your-domain.com
ADDITIONAL_REDIRECT_URLS=https://your-domain.com/**/

# PostgREST (API Gateway)
API_EXTERNAL_URL=https://your-domain.com

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
ANON_KEY=your-anon-key
SERVICE_KEY=your-service-key

# Database
POSTGRES_PASSWORD=your-db-password
POSTGRES_DB=postgres

# Storage
STORAGE_BACKEND=filesystem
FILE_SIZE_LIMIT=52428800
```

### Start Supabase

```bash
# Pull images and start (first time takes 10-15 minutes)
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

---

## Step 4: Configure Three Databases

Supabase uses a multi-database setup. We'll create separate databases for each app.

### Connect to Postgres

```bash
# Get PostgreSQL container name
docker exec -it supabase-db-1 psql -U postgres -d postgres
```

### Create Databases

```sql
-- Create separate databases for each app
CREATE DATABASE qigong_db;
CREATE DATABASE walking_db;
CREATE DATABASE gtg_db;

-- Create app-specific schemas within each database
-- This allows for future migration to separate instances

-- For qigong_db
\c qigong_db
CREATE SCHEMA qigong_auth;
CREATE SCHEMA qigong_data;
CREATE SCHEMA qigong_storage;

-- For walking_db
\c walking_db
CREATE SCHEMA walking_auth;
CREATE SCHEMA walking_data;
CREATE SCHEMA walking_storage;

-- For gtg_db
\c gtg_db
CREATE SCHEMA gtg_auth;
CREATE SCHEMA gtg_data;
CREATE SCHEMA gtg_storage;
```

---

## Step 5: Configure API Keys Per App

For each app, generate separate API keys in Supabase Studio:

1. Navigate to `Settings > API` in Supabase Studio
2. Create new `anon` key for each app:
   - `expo-research-qigong-anon-key`
   - `expo-research-walking-anon-key`
   - `expo-research-gtg-anon-key`

3. Create corresponding service role keys (for Edge Functions)

---

## Step 6: Configure Storage Folders

In Supabase Dashboard > Storage, create buckets with proper policies:

### Storage Structure

```
storage/
├── qigong/       (Qigong app files)
├── walking/      (Walking app files)
├── gtg/          (GTG app files)
└── public/       (Shared public assets)
```

### Storage Policies (Example for qigong)

```sql
-- Create storage bucket for qigong
INSERT INTO storage.buckets (id, name, public)
VALUES ('qigong', 'qigong', false);

-- Allow authenticated users to upload to their app folder
CREATE POLICY "Users can upload qigong files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'qigong'
  AND (storage.foldername(bucket_id, name))[1] = auth.jwt() ->> 'app_id'
);

-- Allow authenticated users to read their app folder
CREATE POLICY "Users can read qigong files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'qigong');
```

---

## Step 7: Nginx Reverse Proxy (Optional but Recommended)

```nginx
# /etc/nginx/sites-available/supabase
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:54321;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /storage/ {
        proxy_pass http://localhost:54324;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /functions/ {
        proxy_pass http://localhost:54321;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

---

## Step 8: SSL Configuration (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal (should be automatic, but verify)
sudo certbot renew --dry-run
```

---

## Step 9: Authentication Configuration

### Apple Sign In Setup

1. Go to [Apple Developer Console](https://developer.apple.com)
2. Create App ID with "Sign In with Apple" capability
3. Create Service ID for your backend
4. Generate private key for signing
5. Configure redirect URLs in Supabase Dashboard:
   ```
   https://your-domain.com/auth/v1/callback
   ```

### Environment Variables for Apple

```env
# Apple Sign In
APPLE_CLIENT_ID=com.yourcompany.yourapp
APPLE_TEAM_ID=XXXXXXXXXX
APPLE_KEY_ID=XXXXXXXXXX
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

### Google Sign In Setup

1. Create project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable OAuth 2.0 API
3. Create OAuth Client ID (Web application type)
4. Add authorized redirect URI:
   ```
   https://your-domain.com/auth/v1/callback
   ```

---

## Step 10: Edge Functions Setup

Supabase Edge Functions run Deno TypeScript at the edge.

### Configuration

```env
# Edge Functions
FUNCTIONS_KEY=your-functions-key
```

### Example Edge Function Structure

```
supabase/
└── functions/
    ├── qigong/
    │   ├── index.ts
    │   └── share-program.ts
    ├── walking/
    │   ├── index.ts
    │   ├── calculate-route.ts
    │   └── generate-share-image.ts
    └── gtg/
        ├── index.ts
        └── send-reminder.ts
```

### Deploy Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy qigong-share-program
supabase functions deploy walking-calculate-route
supabase functions deploy gtg-send-reminder
```

---

## Step 11: Verify Installation

### Health Check

```bash
# Check if all services are running
curl https://your-domain.com/health

# Expected response: {"status":"healthy","version":"x.x.x"}
```

### Database Connection

```bash
# Test database connection
psql "postgresql://postgres:[PASSWORD]@localhost:54322/postgres"

# List databases
\l
# Should show: qigong_db, walking_db, gtg_db
```

### Storage Check

```bash
# Test file upload via CLI
curl -X POST https://your-domain.com/storage/v1/object/qigong/test.txt \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: text/plain" \
  -d "test content"
```

---

## Maintenance

### Backup Strategy

```bash
# Create backup script
cat > /opt/supabase-backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)

# Backup each database
for DB in qigong_db walking_db gtg_db; do
  docker exec supabase-db-1 pg_dump -U postgres $DB > /backups/${DB}_${DATE}.sql
done

# Backup storage
docker run --rm -v supabase_storage:/data -v /backups:/backup alpine \
  tar czf /backup/storage_${DATE}.tar.gz -C /data .

# Cleanup old backups (keep last 7 days)
find /backups -mtime +7 -delete
EOF

chmod +x /opt/supabase-backup.sh

# Add to crontab
echo "0 2 * * * /opt/supabase-backup.sh" | sudo tee /etc/cron.d/supabase-backup
```

### Updates

```bash
# Pull latest images
cd /opt/supabase
git pull
docker-compose pull

# Restart services
docker-compose up -d

# Clean up old images
docker image prune -f
```

### Monitoring

```bash
# Check resource usage
docker stats

# View logs
docker-compose logs -f --tail=100

# Check disk space
df -h
```

---

## Migration Path: Separating Apps Later

When you need to move an app to its own VPS:

### Step 1: Export Database

```bash
# Export specific app's database
docker exec supabase-db-1 pg_dump -U postgres gtg_db > gtg_db_backup.sql

# Copy to new server
scp gtg_db_backup.sql user@new-server:/opt/
```

### Step 2: Export Auth Users

```sql
-- In current Supabase
SELECT id, email, created_at, app_id
INTO OUTFILE '/tmp/gtg_users.csv'
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
FROM auth.users
WHERE app_id = 'gtg';
```

### Step 3: Export Storage

```bash
# Copy folder to new location or new server
docker run --rm -v supabase_storage:/data -v /tmp:/backup alpine \
  tar czf /backup/gtg_storage.tar.gz -C /data gtg/
```

### Step 4: Import to New Server

```bash
# On new server
psql -U postgres -d gtg_db < gtg_db_backup.sql

# Recreate auth users
# (You'll need to regenerate passwords or use link magic)
```

---

## Troubleshooting

### Services Not Starting

```bash
# Check if ports are in use
sudo lsof -i :54321
sudo lsof -i :54322
sudo lsof -i :54324

# Kill conflicting processes
sudo fuser -k 54321/tcp
```

### Database Connection Issues

```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Restart database
docker-compose restart db
```

### Storage Issues

```bash
# Check storage service logs
docker-compose logs storage

# Verify filesystem permissions
ls -la /var/lib/supabase/storage/
```

---

## Cost Breakdown

| Resource | Monthly Cost |
|----------|-------------|
| VPS (4GB RAM, 2 vCPU, 80GB) | ~$20 (DigitalOcean) |
| Domain | ~$10-15/year |
| SSL | Free (Let's Encrypt) |
| **Total** | **~$20-25/month** |

For 8GB RAM recommended setup: ~$40/month