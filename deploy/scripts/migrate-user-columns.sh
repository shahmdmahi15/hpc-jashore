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

    # 1. Ensure staff table DDL exists first (prevents SQLite trigger failure: no such table: main.staff)
    echo "🛡️ Ensuring legacy staff mirror table DDL exists..."
    sqlite3 "$DB_FILE" "
      CREATE TABLE IF NOT EXISTS staff (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT,
        full_name TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL DEFAULT '',
        phone TEXT,
        specialization TEXT,
        fee_override_paisa INTEGER,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    "

    # 2. Get existing columns and add missing user columns
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

    # 3. Mirror users into staff table safely now that all user columns exist
    echo "🛡️ Mirroring users to staff..."
    sqlite3 "$DB_FILE" "
      INSERT OR REPLACE INTO staff (id, user_id, full_name, role, phone, is_active, created_at, updated_at)
      SELECT 
        u.id, 
        u.id, 
        COALESCE(u.display_name, u.email, 'Staff Member'), 
        u.role, 
        COALESCE(u.phone, ''), 
        COALESCE(u.is_active, 1), 
        COALESCE(u.created_at, CURRENT_TIMESTAMP), 
        COALESCE(u.updated_at, CURRENT_TIMESTAMP)
      FROM users u;
    "

    # Ensure admin users are approved
    sqlite3 "$DB_FILE" "UPDATE users SET is_approved = 1, approval_status = 'approved' WHERE role = 'admin';"
    echo "✅ Admin users marked as approved."

    # 4. Safety stubs for legacy shifts and desks (prevents any 'no such table: main.shifts' errors)
    echo "🛡️ Ensuring safety stubs for shifts and desks..."
    sqlite3 "$DB_FILE" "
      CREATE TABLE IF NOT EXISTS shifts (id TEXT PRIMARY KEY NOT NULL, name TEXT);
      CREATE TABLE IF NOT EXISTS desks (id TEXT PRIMARY KEY NOT NULL, name TEXT);
    "

    # 5. Cleanly rebuild cash_drawers table (remove shifts, desks, staff FKs)
    echo "💰 Rebuilding cash_drawers table without legacy shifts/desks foreign keys..."
    sqlite3 "$DB_FILE" "
      PRAGMA foreign_keys = OFF;
      CREATE TABLE IF NOT EXISTS _cash_drawers_clean (
        id TEXT PRIMARY KEY NOT NULL,
        cashier_staff_id TEXT NOT NULL REFERENCES users(id),
        desk_id TEXT,
        opened_at TEXT NOT NULL,
        closed_at TEXT,
        opening_cash_paisa INTEGER NOT NULL,
        closing_cash_actual_paisa INTEGER,
        closing_cash_expected_paisa INTEGER,
        variance_paisa INTEGER,
        variance_reason TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        closed_by_admin_id TEXT REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      INSERT OR IGNORE INTO _cash_drawers_clean (
        id, cashier_staff_id, desk_id, opened_at, closed_at,
        opening_cash_paisa, closing_cash_actual_paisa, closing_cash_expected_paisa,
        variance_paisa, variance_reason, status, closed_by_admin_id, created_at, updated_at
      )
      SELECT 
        id, cashier_staff_id, desk_id, opened_at, closed_at,
        opening_cash_paisa, closing_cash_actual_paisa, closing_cash_expected_paisa,
        variance_paisa, variance_reason, status, closed_by_admin_id, created_at, updated_at
      FROM cash_drawers;
      DROP TABLE cash_drawers;
      ALTER TABLE _cash_drawers_clean RENAME TO cash_drawers;
      PRAGMA foreign_keys = ON;
    "

    # 6. Cleanly rebuild drawer_events table (FK to cash_drawers and users)
    echo "💰 Rebuilding drawer_events table without legacy staff FK..."
    sqlite3 "$DB_FILE" "
      PRAGMA foreign_keys = OFF;
      CREATE TABLE IF NOT EXISTS _drawer_events_clean (
        id TEXT PRIMARY KEY NOT NULL,
        drawer_id TEXT NOT NULL REFERENCES cash_drawers(id),
        event_type TEXT NOT NULL,
        amount_paisa INTEGER NOT NULL,
        description TEXT,
        staff_id TEXT REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      INSERT OR IGNORE INTO _drawer_events_clean (
        id, drawer_id, event_type, amount_paisa, description, staff_id, created_at, updated_at
      )
      SELECT 
        id, drawer_id, event_type, amount_paisa, description, staff_id, created_at, updated_at
      FROM drawer_events;
      DROP TABLE drawer_events;
      ALTER TABLE _drawer_events_clean RENAME TO drawer_events;
      PRAGMA foreign_keys = ON;
    "

    # 7. Cleanly drop obsolete tables: stock_moves, inventory_items, attendance, machines, batches, etc.
    echo "🧹 Safely dropping obsolete tables (stock_moves, inventory_items, attendance, machines, batches)..."
    sqlite3 "$DB_FILE" "
      DROP TABLE IF EXISTS stock_moves;
      DROP TABLE IF EXISTS inventory_items;
      DROP TABLE IF EXISTS attendance;
      DROP TABLE IF EXISTS machines;
      DROP TABLE IF EXISTS batches;
      DROP TABLE IF EXISTS pin_credentials;
      DROP TABLE IF EXISTS action_grants;
    "

    # 8. Ensure chat_messages table and indexes exist
    echo "💬 Ensuring chat_messages table and indexes exist..."
    sqlite3 "$DB_FILE" "
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY NOT NULL,
        chat_date TEXT NOT NULL,
        sender_user_id TEXT NOT NULL REFERENCES users(id),
        sender_name TEXT NOT NULL,
        sender_role TEXT NOT NULL,
        content TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'normal',
        message_type TEXT NOT NULL DEFAULT 'text',
        patient_id TEXT REFERENCES patients(id),
        patient_mrn TEXT,
        patient_name TEXT,
        mentions TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_chat_messages_date ON chat_messages(chat_date);
    "

    # 5. Ensure medicines table has current_stock and mrp_paisa
    echo "💊 Ensuring medicines table has current_stock and mrp_paisa..."
    MED_COLS=$(sqlite3 "$DB_FILE" "PRAGMA table_info('medicines');" | awk -F'|' '{print $2}')
    if ! echo "$MED_COLS" | grep -qw "current_stock"; then
      sqlite3 "$DB_FILE" "ALTER TABLE medicines ADD COLUMN current_stock INTEGER NOT NULL DEFAULT 0;"
      echo "   [ADDING] Added current_stock to medicines"
    fi
    if ! echo "$MED_COLS" | grep -qw "mrp_paisa"; then
      sqlite3 "$DB_FILE" "ALTER TABLE medicines ADD COLUMN mrp_paisa INTEGER NOT NULL DEFAULT 0;"
      echo "   [ADDING] Added mrp_paisa to medicines"
    fi

    # 6. Ensure patients table has legacy_id
    echo "📁 Ensuring patients table has legacy_id column..."
    PATIENT_COLS=$(sqlite3 "$DB_FILE" "PRAGMA table_info('patients');" | awk -F'|' '{print $2}')
    if ! echo "$PATIENT_COLS" | grep -qw "legacy_id"; then
      sqlite3 "$DB_FILE" "ALTER TABLE patients ADD COLUMN legacy_id TEXT;"
      sqlite3 "$DB_FILE" "CREATE INDEX IF NOT EXISTS idx_patients_legacy_id ON patients(legacy_id);"
      echo "   [ADDING] Added legacy_id to patients"
    fi

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
