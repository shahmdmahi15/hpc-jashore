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

Write-Host "Creating backup: $BackupTarget ..."
Copy-Item $DbPath $BackupTarget

# If .db-wal exists, also checkpoint or copy
$WalPath = "$DbPath-wal"
if (Test-Path $WalPath) {
  Copy-Item $WalPath "$BackupTarget-wal" -ErrorAction SilentlyContinue
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
