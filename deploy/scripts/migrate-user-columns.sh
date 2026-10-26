#!/usr/bin/env bash
# ==============================================================================
# HPC Jashore — Migrate User Table Columns (Lightsail & Local)
# Adds missing clinical & doctor profile columns to 'users' table
# ==============================================================================
set -euo pipefail

echo "=========================================================="
echo "🏥 HPC Jashore — Migrate User Table Columns"
echo "=========================================================="

DB_LOCATIONS=(
  "/var/www/hpc-jashore/data/hpc.db"
  "/var/www/hpc-jashore/apps/api/data/hpc.db"
)

COLS=(
  "phone TEXT"
  "consultation_fee_paisa INTEGER NOT NULL DEFAULT 50000"
  "follow_up_fee_paisa INTEGER NOT NULL DEFAULT 0"
  "report_fee_paisa INTEGER NOT NULL DEFAULT 0"
  "chamber_room_id TEXT"
  "specialization TEXT"
  "qualifications TEXT"
  "daily_quota INTEGER DEFAULT 40"
  "slot_duration_minutes INTEGER DEFAULT 15"
  "duty_start_time TEXT"
  "duty_end_time TEXT"
  "available_days TEXT"
  "notes TEXT"
  "is_approved INTEGER NOT NULL DEFAULT 0"
  "approval_status TEXT NOT NULL DEFAULT 'pending'"
  "approved_at TEXT"
  "approved_by TEXT"
  "rejection_reason TEXT"
)

FOUND=0

for DB_FILE in "${DB_LOCATIONS[@]}"; do
  if [ -f "$DB_FILE" ]; then
    FOUND=1
    echo ""
    echo "📍 Migrating database: $DB_FILE"
    BACKUP_DIR="$(dirname "$DB_FILE")/backups"
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/hpc.db.backup_$(date +%Y%m%d_%H%M%S)"
    cp "$DB_FILE" "$BACKUP_FILE"
    echo "🛡️ Backup saved: $BACKUP_FILE"

    # Get existing columns
    EXISTING_COLS=$(sqlite3 "$DB_FILE" "PRAGMA table_info('users');" | awk -F'|' '{print $2}')

    for DEF in "${COLS[@]}"; do
      COL_NAME=$(echo "$DEF" | awk '{print $1}')
      if echo "$EXISTING_COLS" | grep -qw "$COL_NAME"; then
        echo "   [EXISTS] Column '$COL_NAME' already exists in users"
      else
        echo "   [ADDING] Adding column: $COL_NAME ($DEF)"
        sqlite3 "$DB_FILE" "ALTER TABLE users ADD COLUMN $DEF;"
      fi
    done

    # Ensure admin users are approved
    sqlite3 "$DB_FILE" "UPDATE users SET is_approved = 1, approval_status = 'approved' WHERE role = 'admin';"
    echo "✅ Admin users marked as approved."

    echo "📊 Current users schema in $DB_FILE:"
    sqlite3 "$DB_FILE" "PRAGMA table_info('users');"
  fi
done

if [ "$FOUND" -eq 0 ]; then
  echo "⚠️ Warning: No hpc.db found in expected locations!"
  find /var/www/hpc-jashore -name "hpc.db" || true
fi

echo ""
echo "🔄 Reloading PM2 processes on Lightsail..."
export PATH="$HOME/.local/share/pnpm:/usr/local/bin:/usr/bin:/bin:$PATH"
if command -v pm2 >/dev/null 2>&1; then
  pm2 reload hpc-api --update-env || true
  pm2 reload hpc-web --update-env || true
  pm2 save || true
  echo "✅ PM2 reloaded."
else
  echo "⚠️ PM2 not found in PATH."
fi

echo ""
echo "=========================================================="
echo "🎉 User Table Columns Migration Completed Successfully!"
echo "=========================================================="
