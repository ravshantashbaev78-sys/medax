#!/usr/bin/env bash
set -e

# ==============================================================================
# MEDAX Production Automated Backup Script
# Creates timestamped compressed backups of PostgreSQL database & uploaded files.
# Automatically purges backups older than 14 days to preserve disk space.
# ==============================================================================

BACKUP_DIR="/home/ubuntu/medax/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_CONTAINER="medax_postgres"
DB_USER="medax_user"
DB_NAME="medax_db"
UPLOADS_VOLUME="medax_uploads_data"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting Medax backup..."

# 1. PostgreSQL Database Dump (Compressed)
DB_BACKUP_FILE="$BACKUP_DIR/db_${DB_NAME}_${TIMESTAMP}.sql.gz"
if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    echo "[$(date)] Dumping PostgreSQL database..."
    docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$DB_BACKUP_FILE"
    echo "[$(date)] Database backup saved to: $DB_BACKUP_FILE ($(du -h "$DB_BACKUP_FILE" | cut -f1))"
else
    echo "[$(date)] WARNING: $DB_CONTAINER container is not running, skipping db dump!"
fi

# 2. Uploaded Media / Documents Backup (Compressed tarball)
UPLOADS_BACKUP_FILE="$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz"
if docker volume ls -q | grep -q "^${UPLOADS_VOLUME}$"; then
    echo "[$(date)] Archiving uploads volume..."
    docker run --rm -v "${UPLOADS_VOLUME}:/data:ro" -v "${BACKUP_DIR}:/backup" alpine tar -czf "/backup/uploads_${TIMESTAMP}.tar.gz" -C /data .
    echo "[$(date)] Uploads backup saved to: $UPLOADS_BACKUP_FILE ($(du -h "$UPLOADS_BACKUP_FILE" | cut -f1))"
fi

# 3. Clean up backups older than 14 days
echo "[$(date)] Cleaning up backups older than 14 days..."
find "$BACKUP_DIR" -type f -name "*.gz" -mtime +14 -exec rm -f {} +

echo "[$(date)] Medax backup completed successfully."
