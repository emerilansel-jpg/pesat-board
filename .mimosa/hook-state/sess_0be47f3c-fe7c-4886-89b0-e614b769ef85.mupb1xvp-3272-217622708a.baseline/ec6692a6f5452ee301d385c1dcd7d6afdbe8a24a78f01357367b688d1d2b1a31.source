#!/bin/bash
# Pesat Board — backup harian (DB + uploads + WA sessions)
# Install: chmod +x, lalu cron: 0 3 * * * /var/www/pesat-board/deploy/backup.sh >> /var/log/pesat-board-backup.log 2>&1
set -e
STAMP=$(date +%F_%H%M)
DEST=/var/backups/pesat-board/$STAMP
mkdir -p "$DEST"

echo "[$STAMP] backup mulai"
sudo -u postgres pg_dump pesatboard | gzip > "$DEST/pesatboard.sql.gz"
[ -d /var/www/pesat-board/uploads ] && tar czf "$DEST/uploads.tar.gz" -C /var/www/pesat-board uploads
[ -d /var/www/pesat-board/wa-sessions ] && tar czf "$DEST/wa-sessions.tar.gz" -C /var/www/pesat-board wa-sessions

# simpan 14 hari terakhir
find /var/backups/pesat-board -mindepth 1 -maxdepth 1 -type d -mtime +14 -exec rm -rf {} +
echo "[$STAMP] backup selesai -> $DEST"
