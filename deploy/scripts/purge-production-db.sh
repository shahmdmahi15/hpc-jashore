#!/usr/bin/env bash
# ==============================================================================
# HPC Jashore — Production Database Purge Script (Lightsail)
# Strictly preserves: users, refresh_sessions, rooms, therapy_slot_configs
# Deletes: ALL other tables (patients, visits, serials, intakes, bills, packages, etc.)
# ==============================================================================
set -euo pipefail

echo "=========================================================="
echo "🏥 HPC Jashore — Production Database Purge"
echo "=========================================================="

# Candidate database locations on Lightsail
DB_LOCATIONS=(
  "/var/www/hpc-jashore/data/hpc.db"
  "/var/www/hpc-jashore/apps/api/data/hpc.db"
)

FOUND=0

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

    echo "🧹 Executing atomic wipe of operational & setup tables..."
    sqlite3 "$DB_FILE" << 'EOF'
PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- Operational & Clinical Tables
DELETE FROM action_grants;
DELETE FROM audit_logs;
DELETE FROM pin_credentials;
DELETE FROM sequences;
DELETE FROM shifts;
DELETE FROM attendance;
DELETE FROM announcements;
DELETE FROM feedback;

-- Patient & Queue Tables
DELETE FROM patient_intake_forms;
DELETE FROM assessments;
DELETE FROM consultations;
DELETE FROM therapy_sessions;
DELETE FROM therapy_plans;
DELETE FROM visits;
DELETE FROM serials;
DELETE FROM appointments;
DELETE FROM patients;

-- Billing & Cash Drawers
DELETE FROM bills;
DELETE FROM bill_items;
DELETE FROM payments;
DELETE FROM dues;
DELETE FROM package_credits;
DELETE FROM cash_drawers;
DELETE FROM drawer_events;
DELETE FROM expenses;

-- Pharmacy & Inventory
DELETE FROM prescriptions;
DELETE FROM prescription_items;
DELETE FROM medicines;
DELETE FROM batches;
DELETE FROM stock_moves;
DELETE FROM inventory_items;

-- Master Setups (Wiping per strict wipe selection)
DELETE FROM packages;
DELETE FROM machines;
DELETE FROM modalities;
DELETE FROM settings;
DELETE FROM staff;
DELETE FROM tv_devices;

COMMIT;
PRAGMA foreign_keys = ON;
VACUUM;
EOF

    echo "📊 Table Row Counts for $DB_FILE:"
    sqlite3 "$DB_FILE" << 'EOF'
.mode column
.headers on
SELECT 'users' AS [table], count(*) AS count FROM users
UNION ALL SELECT 'refresh_sessions', count(*) FROM refresh_sessions
UNION ALL SELECT 'rooms', count(*) FROM rooms
UNION ALL SELECT 'therapy_slot_configs', count(*) FROM therapy_slot_configs
UNION ALL SELECT 'patients', count(*) FROM patients
UNION ALL SELECT 'visits', count(*) FROM visits
UNION ALL SELECT 'patient_intake_forms', count(*) FROM patient_intake_forms
UNION ALL SELECT 'bills', count(*) FROM bills
UNION ALL SELECT 'staff', count(*) FROM staff
UNION ALL SELECT 'packages', count(*) FROM packages
UNION ALL SELECT 'machines', count(*) FROM machines;
EOF
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
