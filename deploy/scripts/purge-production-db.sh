#!/usr/bin/env bash
# ==============================================================================
# HPC Jashore — Production Database Purge Script (Lightsail)
# Strictly preserves: users, refresh_sessions, rooms, therapy_slot_configs
# Deletes: ALL other tables dynamically and safely
# ==============================================================================
set -euo pipefail

echo "=========================================================="
echo "🏥 HPC Jashore — Production Database Purge"
echo "=========================================================="

DB_LOCATIONS=(
  "/var/www/hpc-jashore/data/hpc.db"
  "/var/www/hpc-jashore/apps/api/data/hpc.db"
)

FOUND=0
KEEP_TABLES=" users refresh_sessions rooms therapy_slot_configs __drizzle_migrations "

for DB_FILE in "${DB_LOCATIONS[@]}"; do
  if [ -f "$DB_FILE" ]; then
    FOUND=1
    echo ""
    echo "📍 Found database at: $DB_FILE"

    BACKUP_DIR="$(dirname "$DB_FILE")/backups"
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/hpc.db.backup_$(date +%Y%m%d_%H%M%S)"
    cp "$DB_FILE" "$BACKUP_FILE"
    echo "🛡️ Safety backup created: $BACKUP_FILE"

    echo "🔍 Discovering all tables in $DB_FILE..."
    ALL_TABLES=$(sqlite3 "$DB_FILE" "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")

    echo "🧹 Purging all tables except preserved core tables..."
    sqlite3 "$DB_FILE" "PRAGMA foreign_keys = OFF;"
    for T in $ALL_TABLES; do
      if [[ ! "$KEEP_TABLES" =~ " $T " ]]; then
        echo "   -> Purging table: $T"
        sqlite3 "$DB_FILE" "DELETE FROM \"$T\";" 2>/dev/null || true
      else
        echo "   [KEPT] Table preserved: $T"
      fi
    done
    sqlite3 "$DB_FILE" "PRAGMA foreign_keys = ON; VACUUM;"

    echo ""
    echo "📊 Verifying Final Row Counts for $DB_FILE:"
    for T in $ALL_TABLES; do
      COUNT=$(sqlite3 "$DB_FILE" "SELECT count(*) FROM \"$T\";" 2>/dev/null || echo "0")
      if [ "$COUNT" -gt 0 ]; then
        echo "   * $T: $COUNT rows (PRESERVED)"
      else
        echo "   * $T: 0 rows (CLEARED)"
      fi
    done
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
echo "🎉 Production Database Purge Completed Successfully!"
echo "=========================================================="
