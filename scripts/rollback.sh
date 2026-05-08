#!/bin/bash
# scripts/rollback.sh
# Manual rollback script for emergency use
# Run this on the production VPS via SSH

set -e

APP=$1
ENVIRONMENT=$2

if [ -z "$APP" ] || [ -z "$ENVIRONMENT" ]; then
    echo "Usage: ./rollback.sh <app> <environment>"
    echo "Example: ./rollback.sh gtg production"
    exit 1
fi

APP_DIR="/var/www/$APP"

echo "========================================="
echo "Manual Rollback: $APP to $ENVIRONMENT"
echo "========================================="
echo ""

# Check if previous build exists
if [ ! -d "$APP_DIR/releases/previous" ]; then
    echo "ERROR: No previous build found at $APP_DIR/releases/previous"
    exit 1
fi

# Confirm action
echo "⚠️  WARNING: This will rollback $APP on $ENVIRONMENT"
echo ""
echo "Current state:"
ls -la "$APP_DIR/current" 2>/dev/null || echo "  (no current directory)"
echo ""
echo "Rollback target:"
ls -la "$APP_DIR/releases/previous"
echo ""

read -p "Are you sure? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Rollback cancelled."
    exit 0
fi

echo ""
echo "Starting rollback..."

# Backup current before rollback (safety)
if [ -d "$APP_DIR/current" ]; then
    TIMESTAMP=$(date +%Y%m%d%H%M%S)
    echo "Backing up current to releases/emergency/$TIMESTAMP..."
    mkdir -p "$APP_DIR/releases/emergency"
    cp -r "$APP_DIR/current" "$APP_DIR/releases/emergency/$TIMESTAMP"
fi

# Perform rollback
echo "Removing current..."
rm -rf "$APP_DIR/current"

echo "Copying previous to current..."
cp -r "$APP_DIR/releases/previous" "$APP_DIR/current"

echo ""
echo "========================================="
echo "Rollback Complete!"
echo "========================================="
echo ""

# Log the rollback
echo "$(date): Manual rollback by $USER to emergency/$TIMESTAMP" >> "$APP_DIR/rollback.log"

# Verify
echo "Verification:"
ls -la "$APP_DIR/current" | head -10

echo ""
echo "Check the app at: https://$ENVIRONMENT.your-domain.com"
echo "If issues persist, restore from $APP_DIR/releases/emergency/$TIMESTAMP"