# Deploy Runbook — Pesat Board → board.pesat.ai

VPS: root@94.100.26.189 (paramiko, lihat skill deploy-pesat). Tunnel: cloudflared-permanent (ID d55dadca-0c49-4fc3-8f8b-17dd5ec2197c). Backend port: 3400. DB: pesatboard.

## Urutan eksekusi (Stage 6)

### 1. Build lokal (sandbox, worktree final-build)
- `npm run build` (frontend → dist/)
- `cd server && npm ci && npm run build` (backend → dist/) + `npx prisma generate`

### 2. Siapkan VPS (sekali)
```bash
mkdir -p /var/www/pesat-board/{app,server,uploads,wa-sessions,deploy}
sudo -u postgres psql -c "CREATE USER pesatboard WITH PASSWORD '<generated>';"
sudo -u postgres psql -c "CREATE DATABASE pesatboard OWNER pesatboard;"
```

### 3. Upload
- Frontend: isi `dist/` → `/var/www/pesat-board/app/` (tar over SSH)
- Backend: `server/` (tanpa node_modules) → `/var/www/pesat-board/server/`
- Deploy assets: `deploy/` → `/var/www/pesat-board/deploy/`

### 4. Migrasi & env
- `/var/www/pesat-board/server/.env`: DATABASE_URL=postgresql://pesatboard:<pw>@localhost:5432/pesatboard, JWT_SECRET=<generated 48>, PORT=3400, ALLOWED_ORIGINS=https://board.pesat.ai, UPLOAD_DIR=/var/www/pesat-board/uploads, WA_SESSIONS_DIR=/var/www/pesat-board/wa-sessions
- `psql -U pesatboard -d pesatboard -f /var/www/pesat-board/server/prisma/migrations/0001_init.sql`
- `cd /var/www/pesat-board/server && npm ci --omit=dev && npm run build && npx prisma generate`
- Seed awal (opsional): `npm run seed`

### 5. PM2
- `pm2 start ecosystem.config.cjs` (name: pesat-board-api) → `pm2 save` (pm2 startup sudah ada untuk app lain — pastikan tidak menimpa)

### 6. nginx
- `cp deploy/nginx-board.conf /etc/nginx/sites-available/pesat-board`
- `ln -s /etc/nginx/sites-available/pesat-board /etc/nginx/sites-enabled/`
- `nginx -t && systemctl reload nginx`

### 7. Cloudflare Tunnel + DNS
- Edit `/etc/cloudflared/config.yml`: tambah SEBELUM catch-all:
  ```yaml
  - hostname: board.pesat.ai
    service: http://localhost:80
  ```
- `systemctl restart cloudflared-permanent`
- DNS (Cloudflare MCP/API): CNAME `board` → `d55dadca-0c49-4fc3-8f8b-17dd5ec2197c.cfargotunnel.com` (proxied, zone pesat.ai)

### 8. Backup cron
- `chmod +x /var/www/pesat-board/deploy/backup.sh`
- crontab: `0 3 * * * /var/www/pesat-board/deploy/backup.sh >> /var/log/pesat-board-backup.log 2>&1`

### 9. Smoke test
- `curl -s http://127.0.0.1:3400/api/health` → {"ok":true}
- `curl -s -H 'Host: board.pesat.ai' http://127.0.0.1/ | head` → index.html
- `curl -s https://board.pesat.ai/api/health`
- Browser: register → buat board → cek realtime 2 tab → hubungkan WA (QR) → test mention → balas dari HP
- Hard refresh (Ctrl+Shift+R) bila cache lama

### Rollback cepat
- Frontend: re-upload build sebelumnya ke /var/www/pesat-board/app
- Backend: `pm2 restart pesat-board-api` setelah checkout commit lama
- DB: restore `psql pesatboard < /var/backups/pesat-board/<stamp>/pesatboard.sql.gz`
