# Pesat Board — Server

Backend production-grade untuk **Pesat Board**: kanban ala Trello dengan integrasi WhatsApp 2 arah.

Stack: **Fastify 5** (REST) + **Socket.IO 4** (realtime) + **Prisma 6** (PostgreSQL) + **Baileys 6.7** (WhatsApp multi-session). TypeScript strict, ESM, output `dist/` via `tsc`.

## Struktur

```
server/
  prisma/schema.prisma          # skema data (20 tabel)
  prisma/migrations/0001_init.sql
  src/
    index.ts                    # bootstrap (listen, restore sesi WA, graceful shutdown)
    app.ts                      # fastify instance, registrasi plugin & routes
    config.ts db.ts auth.ts     # env, prisma client, JWT + otorisasi role
    realtime.ts                 # socket.io: handshake JWT, rooms, emit helpers, activity
    positions.ts                # float position + slug helpers
    routes/                     # auth, users, workspaces, boards, lists, cards, checklists,
                                # comments, attachments, labels, activities, search, wa, health
    wa/engine.ts                # manajer multi-session Baileys (QR, reconnect backoff)
    wa/outbound.ts              # antrean kirim (1200ms + jitter), retry 2x, pipeline mention
    wa/inbound.ts               # routing pesan masuk: reply / hashtag / media / receipts
    wa/phone.ts                 # normalisasi 08xx -> 62xx, jid helpers
    seed.ts                     # data demo (idempotent)
  ecosystem.config.cjs          # pm2
```

## Menjalankan lokal (dev)

```bash
cd server
cp .env.example .env          # isi DATABASE_URL, JWT_SECRET
npm install                   # otomatis `prisma generate` (postinstall)
# siapkan database (lihat bagian VPS di bawah), lalu:
npm run dev                   # tsx watch
npm run seed                  # data demo (andi@pesat.ai / budi@pesat.ai, password demo1234)
```

## Setup di VPS (production)

Prasyarat: Node.js 22, PostgreSQL, pm2 (`npm i -g pm2`).

```bash
cd server
cp .env.example .env
$EDITOR .env                  # DATABASE_URL, JWT_SECRET (acak kuat), ALLOWED_ORIGINS, PORT

# 1) Database + schema (tanpa perlu prisma migrate, pakai SQL yang sudah digenerate)
sudo -u postgres createdb pesatboard
psql "$DATABASE_URL" -f prisma/migrations/0001_init.sql

# 2) Dependensi + build
npm ci                        # postinstall menjalankan prisma generate
npm run build                 # tsc -> dist/

# 3) (opsional) data demo
npm run seed

# 4) Jalankan dengan pm2
pm2 start ecosystem.config.cjs
pm2 save
```

Cek: `curl http://localhost:3400/api/health` -> `{"ok":true,"wa":0}`.

Folder `uploads/` (lampiran) dan `wa-sessions/` (kredensial WhatsApp) dibuat otomatis; **jangan dihapus** bila ingin sesi WA tetap tersambung setelah restart. Backup keduanya bersama database.

## Auth & otorisasi

- `Authorization: Bearer <jwt>` untuk semua `/api/*` kecuali `/api/auth/*` dan `/api/health`.
- Role workspace: `VIEWER` (read-only, 403 untuk mutasi) < `MEMBER` (CRUD konten) < `ADMIN` (+ kelola board & member) < `OWNER` (+ kelola workspace).
- Register membuat workspace personal `Workspace <nama>` dengan role OWNER.
- `POST /api/auth/google` sudah disiapkan strukturnya (field `googleId`), saat ini `501 coming soon`.

## Realtime (Socket.IO)

- Endpoint: default `/socket.io` pada port yang sama. CORS mengikuti `ALLOWED_ORIGINS`.
- Handshake: `io(url, { auth: { token: <JWT> } })`.
- Saat connect, socket otomatis join room personal `user:{id}` (untuk `wa:qr`, `wa:status`, `wa:inbox-new`).
- Join board: `socket.emit('board:join', boardId, ack)` — server memverifikasi membership, join room `board:{id}`. `board:leave` untuk keluar.
- Event room board: `card:created|card:updated|card:moved|card:deleted`, `list:created|list:updated|list:moved|list:archived`, `checklist:created|checklist:updated|checklist:deleted`, `checklist:item-created|checklist:item-updated|checklist:item-deleted`, `comment:new|comment:updated|comment:deleted`, `comment:wa-status` `{commentId,status}`, `label:*`, `attachment:*`, `board:updated|board:deleted`, `activity:new`.
- Event personal: `wa:qr` `{qr}`, `wa:status` `{status,phone?}`, `wa:inbox-new` `{item}`.

## WhatsApp 2 arah

1. **Connect**: `POST /api/wa/connect` → server membuat sesi Baileys untuk user; QR dikirim via socket event `wa:qr` (data string QR — render dengan lib QR apa pun). Saat tersambung: `wa:status` `{status:'CONNECTED', phone}` dan nomor tersimpan ke `User.waNumber`.
2. **Mention → WA**: komentar dengan `mentions: [userId]` mengirim notifikasi WA ke tiap user yang punya `waNumber`, memakai sesi WA penulis (harus CONNECTED). Pesan memuat instruksi balasan.
3. **Balas via reply**: me-reply (swipe) pesan notifikasi → komentar baru di card yang sama (`source: WA`, `parentId` menunjuk komentar asal).
4. **Balas via hashtag**: kirim `#<board-slug>-<card-slug> pesan anda` → komentar di card yang cocok (slug = judul yang di-slug-kan; harus cocok tepat 1 card). Bila 0/ambigius → masuk **Inbox** (`wa:inbox-new`).
5. **Inbox**: `GET /api/wa/inbox` → `POST /api/wa/inbox/:id/attach {cardId}` (jadikan komentar) atau `/ignore`.
6. **Media**: gambar/dokumen/audio/video diunduh ke `UPLOAD_DIR`, tercatat sebagai `Attachment` + komentar `source: WA`.
7. **Receipts**: status pesan keluar diperbarui (`SENT` → `DELIVERED` → `READ`) dan di-broadcast via `comment:wa-status`.
8. **Reconnect**: putus sementara → backoff 3s/10s/30s (maks 5x). Logout (401) → sesi & folder kredensial dihapus, status `DISCONNECTED`. Saat boot, semua sesi berstatus CONNECTED dipulihkan otomatis.

Pembatasan MVP: hanya chat pribadi (`@s.whatsapp.net`); grup & status broadcast diabaikan. Pemindahan card antar-board belum didukung (400).

## Variabel lingkungan

| Var | Default | Keterangan |
|---|---|---|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `JWT_SECRET` | `changeme` | **Wajib diganti di production** |
| `PORT` | `3400` | Port HTTP |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | CSV origin untuk CORS (REST + socket.io) |
| `UPLOAD_DIR` | `./uploads` | Folder lampiran |
| `WA_SESSIONS_DIR` | `./wa-sessions` | Folder kredensial WA per user |

## Script npm

| Script | Fungsi |
|---|---|
| `npm run dev` | Dev server (tsx watch) |
| `npm run build` | Kompilasi `tsc` → `dist/` |
| `npm start` | `node dist/index.js` |
| `npm run seed` | Data demo idempotent |
| `npm run migrate:sql` | Regenerate `prisma/migrations/0001_init.sql` dari schema (tanpa DB) |
| `npm run prisma:validate` / `prisma:generate` | Validasi schema / generate client |
