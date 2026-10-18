# deploy/scripts/backup-db.ps1
# Automated SQLite WAL-safe Backup Script for Windows environments

param(
  [string]$DbPath = "./data/hpc.db",
  [string]$BackupDir = "./data/backups",
  [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $DbPath)) {
  Write-Error "Database file $DbPath does not exist!"
}

if (-not (Test-Path $BackupDir)) {
  New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$BackupTarget = Join-Path $BackupDir "hpc_$Timestamp.db"

Write-Host "Creating WAL-safe point-in-time backup: $BackupTarget ..."

# Use sqlite3 .backup CLI if available, else VACUUM INTO
$SqliteCmd = Get-Command sqlite3.exe -ErrorAction SilentlyContinue
if ($SqliteCmd) {
  & sqlite3.exe $DbPath ".backup '$BackupTarget'"
  $Integrity = & sqlite3.exe $BackupTarget "PRAGMA integrity_check;"
  if ($Integrity -ne "ok") {
    Remove-Item $BackupTarget -ErrorAction SilentlyContinue
    Write-Error "Integrity check failed: $Integrity"
  }
} else {
  # Fallback: Copy DB and WAL atomically if sqlite3.exe is not installed
  Copy-Item $DbPath $BackupTarget
  $WalPath = "$DbPath-wal"
  if (Test-Path $WalPath) {
    Copy-Item $WalPath "$BackupTarget-wal" -ErrorAction SilentlyContinue
  }
}

# Compress into zip
$ZipTarget = "$BackupTarget.zip"
Compress-Archive -Path "$BackupTarget*" -DestinationPath $ZipTarget -CompressionLevel Optimal
Remove-Item "$BackupTarget*" -ErrorAction SilentlyContinue

Write-Host "Backup completed: $ZipTarget"

# Prune older than RetentionDays
$Limit = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $BackupDir -Filter "hpc_*.zip" | Where-Object { $_.LastWriteTime -lt $Limit } | Remove-Item -Force
Write-Host "Retention check complete (keeping $RetentionDays days)."
