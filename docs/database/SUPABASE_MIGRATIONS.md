# Supabase Migration Guide - Dev to Production

## Overview

This guide explains how to export database schemas/migrations from the development Supabase instance and apply them to the production Supabase instance.

---

## Migration Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LOCAL DEV VPS                                     │
│                                                                       │
│   Supabase (Testing)                                                 │
│   ├── gtg_db                                                        │
│   ├── walking_db                                                    │
│   └── qigong_db                                                     │
│        │                                                             │
│        │ (make schema changes in local Supabase Studio)               │
│        │                                                             │
│        ▼                                                             │
│   Export migrations to files                                         │
│        │                                                             │
│        ▼                                                             │
│   infrastructure/supabase/migrations/                                │
│   ├── gtg/                                                          │
│   ├── walking/                                                      │
│   └── qigong/                                                       │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ git push
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        GITHUB                                        │
│                                                                       │
│   Workflow: sync-migrations.yml                                      │
│   - Triggered manually or on push to migrations/ folder              │
│   - Applies .sql files to production Supabase                         │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ ssh to prod VPS
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PRODUCTION VPS                                    │
│                                                                       │
│   Supabase (Production)                                              │
│   ├── gtg_db                                                        │
│   ├── walking_db                                                    │
│   └── qigong_db                                                     │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Export Migrations from Dev Supabase

### Manual Export via pg_dump

```bash
#!/bin/bash
# scripts/export-migrations.sh

set -e

MIGRATION_DIR="infrastructure/supabase/migrations"
DATE=$(date +%Y%m%d_%H%M%S)

# Ensure migration directories exist
mkdir -p "$MIGRATION_DIR/gtg"
mkdir -p "$MIGRATION_DIR/walking"
mkdir -p "$MIGRATION_DIR/qigong"

echo "Exporting migrations from local Supabase..."

# Export GTG database
docker exec supabase-db-1 pg_dump -U postgres \
  --schema-only \
  --no-owner \
  --no-acl \
  gtg_db > "$MIGRATION_DIR/gtg/${DATE}_gtg_schema.sql"

# Export Walking database
docker exec supabase-db-1 pg_dump -U postgres \
  --schema-only \
  --no-owner \
  --no-acl \
  walking_db > "$MIGRATION_DIR/walking/${DATE}_walking_schema.sql"

# Export Qigong database
docker exec supabase-db-1 pg_dump -U postgres \
  --schema-only \
  --no-owner \
  --no-acl \
  qigong_db > "$MIGRATION_DIR/qigong/${DATE}_qigong_schema.sql"

echo "Migrations exported:"
echo "  - $MIGRATION_DIR/gtg/${DATE}_gtg_schema.sql"
echo "  - $MIGRATION_DIR/walking/${DATE}_walking_schema.sql"
echo "  - $MIGRATION_DIR/qigong/${DATE}_qigong_schema.sql"

echo "Review files and commit to git before deploying to production"
```

### Export Specific Tables Only

```bash
# Export only specific tables
docker exec supabase-db-1 pg_dump -U postgres \
  --schema-only \
  --no-owner \
  -t exercises \
  -t programs \
  gtg_db > migrations/gtg/exercises_programs.sql
```

### Export Data (Not Schema)

```bash
# Export data for specific tables
docker exec supabase-db-1 pg_dump -U postgres \
  --data-only \
  --no-owner \
  -t exercises \
  gtg_db > migrations/gtg/exercises_data.sql
```

---

## Step 2: Review and Commit Migrations

### Before Committing

1. **Review the SQL file** - ensure no sensitive data
2. **Check for destructive commands** - DROP TABLE, DROP COLUMN, etc.
3. **Test locally** - apply to a copy of production DB first

```bash
# Test migration locally
docker exec supabase-db-1 psql -U postgres -d gtg_db \
  -f migrations/gtg/test_migration.sql
```

### Commit to Git

```bash
git add infrastructure/supabase/migrations/
git commit -m "feat(migration): add exercises table to gtg_db"
git push origin main
```

---

## Step 3: Apply Migrations to Production

### Via GitHub Actions (Recommended)

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
      action:
        description: 'Action'
        required: true
        type: choice
        options:
          - dry-run
          - apply

env:
  DB_NAME: ${{ inputs.app }}_db

jobs:
  migrate:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Get latest migration file
        id: get-file
        run: |
          FILE=$(ls -t infrastructure/supabase/migrations/${{ inputs.app }}/*.sql | head -1)
          echo "file=$FILE" >> $GITHUB_OUTPUT
          echo "Filename: $FILE"

      - name: Show migration content (dry-run)
        if: inputs.action == 'dry-run'
        run: |
          echo "Would apply: ${{ steps.get-file.outputs.file }}"
          cat ${{ steps.get-file.outputs.file }}

      - name: Backup current database
        if: inputs.action == 'apply'
        run: |
          ssh ${{ secrets.PROD_VPS_USER }}@${{ secrets.PROD_VPS_HOST }} \
            "docker exec supabase-db-1 pg_dump -U postgres ${{ env.DB_NAME }} > /tmp/backup_$(date +%Y%m%d).sql"

      - name: Apply migration
        if: inputs.action == 'apply'
        run: |
          scp ${{ steps.get-file.outputs.file }} \
            ${{ secrets.PROD_VPS_USER }}@${{ secrets.PROD_VPS_HOST }}:/tmp/migration.sql

          ssh ${{ secrets.PROD_VPS_USER }}@${{ secrets.PROD_VPS_HOST }} \
            "docker exec -i supabase-db-1 psql -U postgres -d ${{ env.DB_NAME }} -f /tmp/migration.sql"

      - name: Verify migration
        if: inputs.action == 'apply'
        run: |
          echo "Checking if tables exist..."
          ssh ${{ secrets.PROD_VPS_USER }}@${{ secrets.PROD_VPS_HOST }} \
            "docker exec supabase-db-1 psql -U postgres -d ${{ env.DB_NAME }} -c '\dt'"
```

### Manual SSH (Emergency)

```bash
# SSH to production VPS
ssh user@prod-vps-host

# Copy migration file
scp user@dev-vps:/path/to/migration.sql /tmp/

# Backup first
docker exec supabase-db-1 pg_dump -U postgres gtg_db > /tmp/backup.sql

# Apply
docker exec -i supabase-db-1 psql -U postgres -d gtg_db -f /tmp/migration.sql

# Verify
docker exec supabase-db-1 psql -U postgres -d gtg_db -c '\dt'
```

---

## Migration File Naming Convention

```
{YYYYMMDD}_{HHMMSS}}_{description}.sql

Examples:
├── gtg/
│   ├── 20240101000000_initial_schema.sql
│   ├── 20240102000000_add_exercises_table.sql
│   ├── 20240103000000_add_programs_table.sql
│   └── 20240104000000_add_user_progress.sql
├── walking/
│   ├── 20240101000000_initial_schema.sql
│   └── 20240105000000_add_routes_table.sql
└── qigong/
    ├── 20240101000000_initial_schema.sql
    └── 20240106000000_add_animations.sql
```

---

## Common Migration Patterns

### Add New Table

```sql
-- migrations/gtg/20240102000000_add_exercises.sql

CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add index
CREATE INDEX idx_exercises_user_id ON exercises(user_id);
```

### Add Column

```sql
-- migrations/gtg/20240103000000_add_difficulty_column.sql

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced'))
  DEFAULT 'beginner';
```

### Rename Column

```sql
-- PostgreSQL doesn't support IF NOT EXISTS for ALTER COLUMN
-- Use a two-step approach:

-- Step 1: Add new column
ALTER TABLE exercises ADD COLUMN new_name TEXT;

-- Step 2: Copy data
UPDATE exercises SET new_name = old_name;

-- Step 3: Drop old column (careful with this!)
ALTER TABLE exercises DROP COLUMN old_name;
```

### Add Foreign Key

```sql
ALTER TABLE workout_entries
ADD CONSTRAINT fk_exercise
FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE SET NULL;
```

### Create Index

```sql
CREATE INDEX CONCURRENTLY idx_workout_sessions_user_date
ON workout_sessions(user_id, date DESC);
```

---

## Supabase Studio for Manual Changes

Sometimes you want to make quick changes for testing:

### 1. Connect to Local Supabase Studio

```
# On dev VPS
# Supabase Studio usually at http://localhost:3000
# Or configure in docker-compose to be accessible externally
```

### 2. Make Changes via SQL Editor

```sql
-- Example: Add a test exercise
INSERT INTO exercises (user_id, name, description)
VALUES (NULL, 'Push-ups', 'Classic chest exercise');
```

### 3. Then Export the Change

```bash
# Export just the exercises table schema
docker exec supabase-db-1 pg_dump -U postgres \
  --schema-only \
  --no-owner \
  -t exercises \
  gtg_db > migrations/gtg/20240102000000_exercises_table.sql
```

---

## Rolling Back Migrations

### Best Practice: Forward-Only Migrations

Instead of rollback scripts, always write forward migrations:

```sql
-- If you need to undo a change, write a new migration that undoes it

-- Example: Remove a column
ALTER TABLE exercises DROP COLUMN IF EXISTS some_column;

-- Don't use: ALTER TABLE exercises DROP COLUMN some_column;
-- (fails if column doesn't exist)
```

### Emergency Rollback

```bash
# If migration breaks production:

# 1. Restore from backup
docker exec supabase-db-1 psql -U postgres -d gtg_db \
  -f /tmp/backup_20240101.sql

# 2. Verify
docker exec supabase-db-1 psql -U postgres -d gtg_db -c '\dt'
```

---

## Verification Checklist

After applying migrations to production:

- [ ] All tables exist (`\dt`)
- [ ] All indexes exist (`\di`)
- [ ] Foreign keys work (`\d table_name`)
- [ ] Data integrity (check for orphaned records)
- [ ] App still works (test basic operations)

```sql
-- Useful verification queries

-- Check table exists
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- Check foreign key
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'workout_entries';

-- Check for orphaned records
SELECT COUNT(*) FROM workout_entries
WHERE exercise_id NOT IN (SELECT id FROM exercises);
```

---

## Migration Tips

### Use `IF NOT EXISTS`

```sql
-- Good
CREATE TABLE IF NOT EXISTS exercises (...);

-- Bad
CREATE TABLE exercises (...);  -- Fails if exists
```

### Use `IF EXISTS` for Dropping

```sql
-- Good
DROP TABLE IF EXISTS old_table;

-- Bad
DROP TABLE old_table;  -- Fails if doesn't exist
```

### Always Add Comments

```sql
-- Good
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Stores the user's custom exercise name if deleted from template
  custom_name TEXT
);

-- Bad: No explanation
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_name TEXT
);
```

### Test on Copy of Production First

```bash
# Create a test database on dev VPS
docker exec supabase-db-1 psql -U postgres -c "CREATE DATABASE gtg_test"

# Restore production backup to test
docker exec supabase-db-1 pg_restore -U postgres -d gtg_test < backup.sql

# Apply migration to test
docker exec supabase-db-1 psql -U postgres -d gtg_test -f migration.sql

# Verify
docker exec supabase-db-1 psql -U postgres -d gtg_test -c '\dt'
```

---

## Environment Variables for Migration

Set these in GitHub Secrets:

```
PROD_VPS_HOST=prod.your-domain.com
PROD_VPS_USER=deploy
PROD_VPS_KEY=<SSH private key>
```

---

## Related Documents

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment guide
- [SCHEMAS.md](./SCHEMAS.md) - Database schemas reference
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Initial Supabase setup
