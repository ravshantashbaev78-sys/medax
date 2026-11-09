#!/usr/bin/env bash
set -e

# ==============================================================================
# MEDAX Production Automated Backup Script
# Creates timestamped compressed backups of PostgreSQL database & uploaded files.
# Database dumps are kept for 14 days; only the latest uploads archives are kept.
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

# 2. Rasmlar va hujjatlar arxivi.
# Rasmlar (webp, pdf) allaqachon siqilgan: gzip faqat vaqt sarflaydi, shuning uchun oddiy tar.
# Har kecha to'liq nusxa olinadi, lekin faqat oxirgi UPLOADS_KEEP tasi saqlanadi:
# 14 ta to'liq nusxa (1000+ mahsulotda ~1.5 GB dan) diskni to'ldirib, bazani to'xtatib qo'yardi.
UPLOADS_KEEP=2
if docker volume ls -q | grep -q "^${UPLOADS_VOLUME}$"; then
    UPLOADS_SIZE_KB=$(docker run --rm -v "${UPLOADS_VOLUME}:/data:ro" alpine du -sk /data | cut -f1)
    FREE_KB=$(df -Pk "$BACKUP_DIR" | awk 'NR==2 {print $4}')
    # Arxiv yozilgandan keyin ham kamida 1 GB bo'sh joy qolishi shart
    if [ "$FREE_KB" -gt $((UPLOADS_SIZE_KB + 1048576)) ]; then
        echo "[$(date)] Archiving uploads volume ($((UPLOADS_SIZE_KB / 1024)) MB)..."
        docker run --rm -v "${UPLOADS_VOLUME}:/data:ro" -v "${BACKUP_DIR}:/backup" alpine tar -cf "/backup/uploads_${TIMESTAMP}.tar" -C /data .
        echo "[$(date)] Uploads backup saved: uploads_${TIMESTAMP}.tar ($(du -h "$BACKUP_DIR/uploads_${TIMESTAMP}.tar" | cut -f1))"
        # Eng yangi UPLOADS_KEEP tadan tashqari barcha rasmlar arxivlarini o'chiramiz (eski .tar.gz ham)
        ls -1t "$BACKUP_DIR"/uploads_*.tar "$BACKUP_DIR"/uploads_*.tar.gz 2>/dev/null | tail -n +$((UPLOADS_KEEP + 1)) | xargs -r rm -f
    else
        echo "[$(date)] WARNING: diskda joy yetarli emas (bo'sh: $((FREE_KB / 1024)) MB, rasmlar: $((UPLOADS_SIZE_KB / 1024)) MB). Rasmlar arxivi o'tkazib yuborildi!"
    fi
fi

# 3. Baza nusxalari 14 kun saqlanadi (ular kichik)
echo "[$(date)] Cleaning up database backups older than 14 days..."
find "$BACKUP_DIR" -type f -name "db_*.gz" -mtime +14 -exec rm -f {} +

# 4. Disk holati: 85% dan oshsa ogohlantirish
USED_PCT=$(df -P "$BACKUP_DIR" | awk 'NR==2 {gsub("%","",$5); print $5}')
echo "[$(date)] Disk band: ${USED_PCT}%"
if [ "$USED_PCT" -ge 85 ]; then
    echo "[$(date)] WARNING: disk ${USED_PCT}% to'lgan. Joy bo'shatish yoki diskni kattalashtirish kerak."
fi

echo "[$(date)] Medax backup completed successfully."
