# Deployment Guide - Complete CI/CD Pipeline

## Overview

This document describes the complete deployment pipeline from development VPS to production, including preview environments, testing distribution, and rollback procedures.

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LOCAL DEV VPS                                 │
│                                                                       │
│   Web Dev Server ──────────────────→ live.your-domain.com (instant)  │
│         │                                                              │
│         │ (git push)                                                  │
│         ▼                                                              │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │
│   │  Supabase   │    │   GitHub    │    │   Storage   │              │
│   │  (Testing)  │    │  Actions    │    │  (Builds)   │              │
│   └─────────────┘    └──────┬──────┘    └─────────────┘              │
│         │                   │                  │                     │
│         │                   ▼                  │                     │
│         │         ┌──────────────────┐        │                     │
│         │         │  Build & Deploy   │        │                     │
│         │         │  to preview VPS   │        │                     │
│         │         └────────┬─────────┘        │                     │
│         │                  │                   │                     │
│         │                  ▼                   │                     │
│         │         preview.your-domain.com ←───┘                     │
│         │                                                      │
└─────────┼───────────────────────────────────────────────────────┘
          │
          │ On merge to main / manual approval
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION VPS                                │
│                                                                       │
│   ┌─────────────┐                        ┌──────────────────────┐   │
│   │  Supabase   │                        │   Production Web      │   │
│   │  (Production)│                       │   prod.your-domain.com│  │
│   └─────────────┘                        └──────────────────────┘   │
│                                                                       │
│   Previous builds stored for rollback:                               │
│   /var/www/gtg/releases/previous/                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Domain Configuration

| Domain                    | Environment | Purpose            | Update Mechanism               |
| ------------------------- | ----------- | ------------------ | ------------------------------ |
| `live.your-domain.com`    | Development | Fast web iteration | Direct file sync (instant)     |
| `preview.your-domain.com` | Staging     | Pipeline testing   | GitHub Actions                 |
| `prod.your-domain.com`    | Production  | Live users         | GitHub Actions (with approval) |

---

## Deployment Workflows

### 1. Development (Instant Updates)

```bash
# On the dev VPS, run:
cd apps/gtg
expo start --web

# Web app now accessible at live.your-domain.com
# Changes to files instantly reflect in browser (hot reload)
```

**For native testing via Expo Orbit:**

```bash
# On dev VPS - run the development server
cd apps/gtg
npx expo start --dev-client

# On your Mac - open Expo Orbit
# It will discover the running project on the network
# Tap "Install" on your iPhone to install the development build
```

### 2. Preview Deployment (Pipeline Testing)

Triggered automatically on push to `main` branch:

```bash
# You push code to main
git push origin main

# GitHub Actions:
# 1. Run tests (ci.yml)
# 2. Build web app
# 3. Deploy to preview.your-domain.com
# 4. Build native apps (.ipa, .apk) for distribution
```

**Native app distribution:**

- `.ipa` uploaded to Diawi or TestFlight for iOS testing
- `.apk` uploaded to Google Play Console internal testing

### 3. Production Deployment

**Automatic (on push to main after preview verified):**

```bash
# If automatic deployment is enabled:
git push origin main  # → preview passes → prod deploys automatically
```

**Manual approval:**

```bash
# Go to GitHub Actions → deploy-production.yml → Click "Run workflow"
# Review the build, approve deployment
```

---

## GitHub Actions Workflows

### Available Workflows

| Workflow                | Trigger                            | What it does                      |
| ----------------------- | ---------------------------------- | --------------------------------- |
| `ci.yml`                | Every push                         | Lint, typecheck, test             |
| `build-all.yml`         | Push to main                       | Build web + native apps           |
| `deploy-preview.yml`    | After build-all                    | Deploy to preview.your-domain.com |
| `deploy-production.yml` | Manual / main push                 | Deploy to prod.your-domain.com    |
| `sync-migrations.yml`   | Manual / on push to `migrations/*` | Apply DB migrations to prod       |
| `rollback.yml`          | Manual                             | Redeploy previous build           |

---

## Preview Deployment (Detailed)

### Trigger: Push to `main` branch

```yaml
# .github/workflows/preview.yml
name: Deploy Preview

on:
  push:
    branches: [main]

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build web app
        run: pnpm --filter @company/gtg web:build

      - name: Deploy to preview VPS
        uses: appleboy/scp-action@v0.1.4
        with:
          host: ${{ secrets.DEV_VPS_HOST }}
          user: ${{ secrets.DEV_VPS_USER }}
          key: ${{ secrets.DEV_VPS_KEY }}
          source: 'apps/gtg/dist/'
          target: '/var/www/gtg/preview/'
          strip_path: 'apps/gtg/dist/'

      - name: Verify deployment
        run: curl -f https://preview.your-domain.com/health || exit 1
```

---

## Production Deployment (Detailed)

### Trigger: Manual or automatic on push to main

```yaml
# .github/workflows/deploy-production.yml
name: Deploy Production

on:
  workflow_dispatch:
    inputs:
      app:
        description: 'App to deploy'
        required: true
        type: choice
        options:
          - gtg
          - walking
          - qigong
      environment:
        description: 'Environment'
        required: true
        type: choice
        options:
          - staging
          - production

env:
  APP_NAME: ${{ inputs.app }}
  VPS_HOST: ${{ inputs.environment == 'production' && secrets.PROD_VPS_HOST || secrets.DEV_VPS_HOST }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build web app
        run: pnpm --filter @company/${{ env.APP_NAME }} web:build

      - name: Create release directory
        run: |
          ssh ${{ secrets.PROD_VPS_USER }}@${{ env.VPS_HOST }} \
            "mkdir -p /var/www/${{ env.APP_NAME }}/releases/$(date +%Y%m%d%H%M%S)"

      - name: Backup current release
        run: |
          ssh ${{ secrets.PROD_VPS_USER }}@${{ env.VPS_HOST }} \
            "cp -r /var/www/${{ env.APP_NAME }}/current /var/www/${{ env.APP_NAME }}/releases/previous"

      - name: Deploy new release
        uses: appleboy/scp-action@v0.1.4
        with:
          host: ${{ env.VPS_HOST }}
          user: ${{ secrets.PROD_VPS_USER }}
          key: ${{ secrets.PROD_VPS_KEY }}
          source: 'apps/${{ env.APP_NAME }}/dist/*'
          target: '/var/www/${{ env.APP_NAME }}/current/'

      - name: Verify deployment
        run: |
          ssh ${{ secrets.PROD_VPS_USER }}@${{ env.VPS_HOST }} \
            "curl -f https://${{ inputs.environment }}.your-domain.com/health"
```

---

## Native App Builds

### Build iOS (.ipa)

```yaml
# .github/workflows/build-ios.yml
name: Build iOS

on:
  workflow_dispatch:

jobs:
  build-ios:
    runs-on: macos-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Setup Xcode
        uses: maxim-lobanov/setup-xcode@v1
        with:
          xcode-version: latest

      - name: Install Apple certificates
        env:
          APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
          APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
        run: |
          echo "$APPLE_CERTIFICATE" | base64 -d > certificate.p12
          security import certificate.p12 -P "$APPLE_CERTIFICATE_PASSWORD" -A -t cert -f pkcs12 -k /Library/Keychains/system.keychain

      - name: Build iOS
        run: |
          cd apps/${{ inputs.app }}
          eas build --local --platform ios --profile production
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: ios-build-${{ inputs.app }}
          path: apps/${{ inputs.app }}/ios-build/*.ipa
```

### Build Android (.apk)

```yaml
# .github/workflows/build-android.yml
name: Build Android

on:
  workflow_dispatch:

jobs:
  build-android:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Build Android
        run: |
          cd apps/${{ inputs.app }}
          eas build --local --platform android --profile production
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
          ANDROID_KEYSTORE: ${{ secrets.ANDROID_KEYSTORE }}
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: android-build-${{ inputs.app }}
          path: apps/${{ inputs.app }}/android/app/build/outputs/apk/**/*.apk
```

---

## Rollback Procedure

### Manual Rollback via GitHub Actions

```yaml
# .github/workflows/rollback.yml
name: Rollback

on:
  workflow_dispatch:
    inputs:
      app:
        description: 'App to rollback'
        required: true
        type: choice
        options:
          - gtg
          - walking
          - qigong
      environment:
        description: 'Environment'
        required: true
        type: choice
        options:
          - preview
          - production

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}

    steps:
      - name: Rollback deployment
        run: |
          ssh ${{ secrets.PROD_VPS_USER }}@${{ secrets.PROD_VPS_HOST }} \
            "cp -r /var/www/${{ inputs.app }}/releases/previous/* /var/www/${{ inputs.app }}/current/"

          ssh ${{ secrets.PROD_VPS_USER }}@${{ secrets.PROD_VPS_HOST }} \
            "echo 'Rolled back at $(date)' >> /var/www/${{ inputs.app }}/rollback.log"
```

### Manual SSH Rollback (Emergency)

```bash
# SSH into production VPS
ssh user@prod-vps-host

# Navigate to app directory
cd /var/www/gtg

# Restore previous build
cp -r releases/previous/* current/

# Verify
curl -f https://prod.your-domain.com/health
```

---

## Database Migration Sync

### Export Migrations from Dev Supabase

```bash
#!/bin/bash
# scripts/export-migrations.sh

set -e

DATE=$(date +%Y%m%d_%H%M%S)
MIGRATION_DIR="infrastructure/supabase/migrations"

echo "Connecting to local Supabase..."
echo "Exporting schema changes..."

# Connect to local Postgres and generate migration
docker exec supabase-db-1 pg_dump -U postgres \
  --schema=public \
  --no-owner \
  --no-acl \
  gtg_db > "$MIGRATION_DIR/gtg/$(date +%Y%m%d)_gtg_schema.sql"

docker exec supabase-db-1 pg_dump -U postgres \
  --schema=public \
  --no-owner \
  --no-acl \
  walking_db > "$MIGRATION_DIR/walking/$(date +%Y%m%d)_walking_schema.sql"

docker exec supabase-db-1 pg_dump -U postgres \
  --schema=public \
  --no-owner \
  --no-acl \
  gtg_db > "$MIGRATION_DIR/gtg/$(date +%Y%m%d)_gtg_schema.sql"

echo "Migrations exported to $MIGRATION_DIR/"
echo "Review and commit to git before deploying to production"
```

### Apply Migrations to Production via GitHub Actions

```yaml
# .github/workflows/sync-migrations.yml
name: Sync Database Migrations

on:
  workflow_dispatch:
    inputs:
      app:
        description: 'App to migrate'
        required: true
        type: choice
        options:
          - gtg
          - walking
          - qigong

jobs:
  migrate:
    runs-on: ubuntu-latest
    environment: production

    steps:
      - name: Checkout migrations
        uses: actions/checkout@v4
        with:
          sparse-checkout: |
            infrastructure/supabase/migrations/${{ inputs.app }}/

      - name: Apply migration
        run: |
          scp infrastructure/supabase/migrations/${{ inputs.app }}/*.sql \
            ${{ secrets.PROD_VPS_USER }}@${{ secrets.PROD_VPS_HOST }}:/tmp/

          ssh ${{ secrets.PROD_VPS_USER }}@${{ secrets.PROD_VPS_HOST }} \
            "docker exec supabase-db-1 psql -U postgres -d ${{ inputs.app }}_db -f /tmp/*.sql"

      - name: Verify migration
        run: |
          ssh ${{ secrets.PROD_VPS_USER }}@${{ secrets.PROD_VPS_HOST }} \
            "docker exec supabase-db-1 pg_dump -U postgres --schema-only ${{ inputs.app }}_db | head -20"
```

---

## Rollback Strategy

### Keep Previous Builds

On production VPS, maintain this structure:

```
/var/www/gtg/
├── current/              # Currently running version
│   ├── index.html
│   └── assets/
├── releases/
│   ├── 20240101120000/   # Previous version
│   │   ├── index.html
│   │   └── assets/
│   ├── 20240102000000/   # Current version (before rollback)
│   └── previous/         # Symlink to most recent rollback point
└── rollback.log          # History of rollbacks
```

### Rollback Command

```bash
# On production VPS
cd /var/www/gtg

# Restore previous
cp -r releases/previous/* current/

# Update previous symlink
rm -rf releases/previous
cp -r releases/20240102000000 releases/previous

# Log rollback
echo "$(date): Rolled back to $(ls -t releases/ | sed -n '2p')" >> rollback.log
```

---

## Health Check Endpoints

Configure your apps to have health check endpoints:

```typescript
// In your app - expose /health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: process.env.VERSION,
    timestamp: new Date().toISOString(),
  });
});
```

---

## Notification on Deployment

Add Slack/Discord notifications:

```yaml
- name: Notify on deployment
  if: always()
  uses: slackapi/slack-github-action@v1.25.0
  with:
    channel-id: ${{ secrets.SLACK_CHANNEL_ID }}
    payload: |
      {
        "text": "${{ job.status }}: Deployment ${{ inputs.app }} to ${{ inputs.environment }}",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*${{ inputs.app }}* deployed to *${{ inputs.environment }}*\nStatus: ${{ job.status }}"
            }
          }
        ]
      }
  env:
    SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
```

---

## Troubleshooting

### Deployment Fails

1. **Check SSH connectivity:**

   ```bash
   ssh -i key.pem user@host "echo 'SSH works'"
   ```

2. **Check disk space on VPS:**

   ```bash
   ssh user@host "df -h"
   ```

3. **View deployment logs:**

   ```bash
   ssh user@host "tail -f /var/www/gtg/deploy.log"
   ```

4. **Verify build artifact exists:**
   ```bash
   ls -la apps/gtg/dist/
   ```

### Build Fails

1. **Check Expo build logs** in GitHub Actions
2. **Verify EAS CLI is logged in:** `eas login`
3. **Check Apple certificates** not expired

### Database Migration Fails

1. **Backup production database first:**

   ```bash
   docker exec supabase-db-1 pg_dump -U postgres gtg_db > backup.sql
   ```

2. **Test migration locally first** against copy of production DB

3. **Use --dry-run** if available

---

## Security Considerations

1. **SSH keys:** Rotate regularly, use passphrase
2. **Secrets:** Never commit to git, use GitHub Secrets
3. **Approvals:** Require manual approval for production
4. **Rollback:** Always keep previous build available
5. **Migrations:** Test on staging before production
