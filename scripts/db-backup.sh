#!/usr/bin/env sh
# ──────────────────────────────────────────────────────────
# SQLite backup script
#
# Designed to run inside the db-backup Docker container.
# Uses `sqlite3 .backup` for a safe online snapshot of the
# live database (does not corrupt under concurrent writes).
#
# Environment variables:
#   DB_PATH               — Path to dev.db (default: /data/dev.db)
#   BACKUP_DIR            — Where to store dumps (default: /backups)
#   BACKUP_RETENTION_DAYS — Delete dumps older than N days (default: 30)
# ──────────────────────────────────────────────────────────

set -eu

DB_PATH="${DB_PATH:-/data/dev.db}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
FILENAME="employeeportal_${TIMESTAMP}.db.gz"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB_PATH" ]; then
  log "ERROR: database file not found at $DB_PATH"
  exit 1
fi

log "Starting backup: $FILENAME"

# Online backup to a temp file, then gzip.
TMP="$BACKUP_DIR/.tmp_${TIMESTAMP}.db"
sqlite3 "$DB_PATH" ".backup '$TMP'"
gzip -c "$TMP" > "$BACKUP_DIR/$FILENAME"
rm -f "$TMP"

SIZE=$(du -h "$BACKUP_DIR/$FILENAME" | cut -f1)
log "Backup complete: $FILENAME ($SIZE)"

# Clean up old backups
DELETED=$(find "$BACKUP_DIR" -name "employeeportal_*.db.gz" -type f -mtime +"$BACKUP_RETENTION_DAYS" -print -delete | wc -l)
if [ "$DELETED" -gt 0 ]; then
  log "Cleaned up $DELETED backup(s) older than $BACKUP_RETENTION_DAYS days."
fi

log "Done."
