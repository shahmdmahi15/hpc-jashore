#!/usr/bin/env bash
# deploy/scripts/backup-db.sh
# Production SQLite WAL-safe Automated Backup Script for HPC Jashore
# Safe to run while the application is actively writing.

set -euo pipefail

DB_DIR="${1:-./data}"
DB_PATH="${DB_DIR}/hpc.db"
BACKUP_DIR="${DB_DIR}/backups"
TIMESTAMP="$(date +"%Y-%m-%d_%H%M%S")"
BACKUP_FILE="${BACKUP_DIR}/hpc_${TIMESTAMP}.db"
RETENTION_DAYS=30

mkdir -p "${BACKUP_DIR}"

if [ ! -f "${DB_PATH}" ]; then
  echo "Error: Database file ${DB_PATH} not found!"
  exit 1
fi

echo "[$(date)] Starting WAL-safe backup of ${DB_PATH}..."

# Use SQLite online backup API to take a non-blocking point-in-time snapshot
sqlite3 "${DB_PATH}" ".backup '${BACKUP_FILE}'"

# Verify integrity of the backup copy
echo "[$(date)] Verifying integrity check on backup..."
INTEGRITY="$(sqlite3 "${BACKUP_FILE}" "PRAGMA integrity_check;")"
if [ "${INTEGRITY}" != "ok" ]; then
  echo "[$(date)] FATAL: Integrity check failed for ${BACKUP_FILE}: ${INTEGRITY}"
  rm -f "${BACKUP_FILE}"
  exit 1
fi

# Compress the backup
gzip -9 "${BACKUP_FILE}"
echo "[$(date)] Backup successfully created and compressed: ${BACKUP_FILE}.gz ($(du -h "${BACKUP_FILE}.gz" | cut -f1))"

# Prune old backups older than 30 days
find "${BACKUP_DIR}" -name "hpc_*.db.gz" -type f -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] Pruning complete. Keeping last ${RETENTION_DAYS} days of daily snapshots."
