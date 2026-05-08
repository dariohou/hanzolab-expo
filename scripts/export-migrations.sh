#!/bin/bash
# scripts/export-migrations.sh
# Export database schemas from local Supabase for version control

set -e

MIGRATION_DIR="infrastructure/supabase/migrations"
DATE=$(date +%Y%m%d_%H%M%S)

echo "========================================="
echo "Supabase Migration Export"
echo "========================================="
echo ""

# Ensure migration directories exist
mkdir -p "$MIGRATION_DIR/gtg"
mkdir -p "$MIGRATION_DIR/walking"
mkdir -p "$MIGRATION_DIR/qigong"

# Check if Supabase is running
if ! docker ps | grep -q supabase-db-1; then
    echo "ERROR: Supabase is not running. Please start it first."
    exit 1
fi

echo "Connected to local Supabase instance"
echo ""

# Function to export database
export_db() {
    local DB_NAME=$1
    local APP_NAME=$2
    
    echo "Exporting $DB_NAME..."
    
    OUTPUT_FILE="$MIGRATION_DIR/$APP_NAME/${DATE}_${DB_NAME}_schema.sql"
    
    docker exec supabase-db-1 pg_dump -U postgres \
        --schema-only \
        --no-owner \
        --no-acl \
        "$DB_NAME" > "$OUTPUT_FILE"
    
    echo "  ✓ Exported to $OUTPUT_FILE"
}

# Export all databases
export_db "gtg_db" "gtg"
export_db "walking_db" "walking"
export_db "qigong_db" "qigong"

echo ""
echo "========================================="
echo "Export Complete!"
echo "========================================="
echo ""
echo "Files created:"
ls -la "$MIGRATION_DIR/gtg/${DATE}"*.sql 2>/dev/null || true
ls -la "$MIGRATION_DIR/walking/${DATE}"*.sql 2>/dev/null || true
ls -la "$MIGRATION_DIR/qigong/${DATE}"*.sql 2>/dev/null || true
echo ""
echo "Next steps:"
echo "1. Review the exported SQL files"
echo "2. Commit to git: git add infrastructure/supabase/migrations/"
echo "3. Push to trigger migration to production"
echo ""
echo "To test migration locally:"
echo "  docker exec -i supabase-db-1 psql -U postgres -d gtg_db -f $MIGRATION_DIR/gtg/${DATE}_gtg_db_schema.sql"
echo ""