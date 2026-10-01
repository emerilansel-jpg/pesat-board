# Coldstart — Project Memory

## [2026-10-01 10:35] — Subpath deploy /smart/board/ LIVE + Security fixes (path traversal + hardcoded password)

- **Type:** DEPLOY + FIX
- **Status:** COMPLETED
- **Versi berjalan:** v1.07
- **Files touched:**
  - Deploy: `vite.config.ts`, `src/lib/base.ts` (BARU), `src/lib/api.ts`, `src/lib/socket.ts`, `src/main.tsx`, `src/features/board/ShareModal.tsx`, `src/pages/VersionPage.tsx`, `src/features/board/AttachmentBlock.tsx`, `src/features/inbox/inbox-utils.ts`
  - Security: `server/src/seed.ts`, `server/src/config.ts`, `server/src/routes/attachments.ts`
- **Key decisions:**
  - **Deployment:** App kini LIVE di `https://pesat.app/smart/board/` (subpath, bukan subdomain `board.pesat.ai` seperti rencana awal).
    - Frontend: base `/smart/board/`, di-serve static oleh Caddy dari `/builds/smart/board/` (worker router pesat.app allowlist `/board/` + `/api/` → VPS origin via sslip.io).
    - Backend: Fastify di VPS port 3400 (PM2), route API di bawah prefix `/api/board`, Socket.IO di path `/board/socket.io`. Postgres fresh (DB lama hilang, schema di-apply ulang + seeded).
  - **Security (Mimosa deep scan, 3 isu nyata diperbaiki & terverifikasi):**
    - `seed.ts`: password demo HARDCODED dihapus → wajib dari env `SEED_DEMO_PASSWORD` (error jika tidak diset) + narrowing tipe untuk TS.
    - `config.ts`: `safeUploadDir()` guard env path traversal — tolak null-byte/absolute, pastikan `path.resolve(root, p)` tetap di dalam root proyek (`UPLOAD_DIR`/`WA_SESSIONS_DIR` tak bisa keluar proyek).
    - `attachments.ts`: upload filename hanya dari `nanoid` + ekstensi whitelist, di-resolve & diverifikasi dalam `uploadDir`; delete path di-strip prefix `/uploads/`, di-resolve, hanya dihapus bila dalam `uploadDir`.
    - Sisa finding `high` di `config.ts` bersifat advisory-only (`verdictEffect: none`) — false positive backward-flow env→resolve, sudah diguard.
- **Known issues:** error TS pre-existing di beberapa file (`user`/`file` implicit any) — tidak terkait perubahan ini.
- **Blockers:** none
- **Next step:** verifikasi end-to-end UI di browser (login → board → upload/hapus lampiran); set env `SEED_DEMO_PASSWORD` di server sebelum reseed
- **Inspector:** PASSED
- **Backup location:** dist di VPS /builds/smart/board/
- **coldstart.md stored at:** D:\Claude Cowork\Pesat Board\extracted\src-extracted\pesat-board-src\coldstart.md

## [2026-07-21 11:40] — Initial Setup

- **Type:** SETUP
- **Status:** COMPLETED
- **Versi berjalan:** v0.01
- **Files touched:** coldstart.md, VERSIONS.md, plan.md, PRD (output)
- **Key decisions:**
  - Project: Pesat Board — Kanban ala Trello (free) + WhatsApp 2-arah di comment.
  - MVP untuk tim internal; desain siap multi-workspace & SaaS nantinya.
  - Hierarki: Workspace → Board → List → Card → Checklist (todolist). Unlimited (tanpa batasan Trello free).
  - WA: jalur self-hosted Baileys (bukan official API) karena requirement nomor WA per-user.
  - Trigger outbound: @mention di comment → WA terkirim dari akun WA pengirim ke penerima.
  - Inbound: reply (quoted message) atau hashtag #board-card → masuk sebagai comment; fallback ke Inbox.
  - Stack: React+Vite+TS+Tailwind+shadcn+dnd-kit (PWA) | Fastify+Socket.IO+Prisma+PostgreSQL 16 | PM2 | nginx | Cloudflare Tunnel.
  - Deploy target: board.pesat.ai (subdomain baru di tunnel + DNS).
  - VPS recon 2026-07-21: Ubuntu 24.04, 2 vCPU, 7.8GB RAM, 131GB free, PG16 aktif, Node v22.22.1, PM2 7.0.1, NO Docker → Baileys in-process (tanpa WAHA container).
  - Port backend dialokasikan: 3400 (3000/3001/3200 sudah dipakai app lain).
- **Known issues:** none
- **Blockers:** none
- **Next step:** Stage 2 — design + scaffold app
- **Inspector:** PASSED
- **Backup location:** none yet (project baru)
- **coldstart.md location:** /mnt/agents/work/pesat-board/coldstart.md

## [2026-07-21 11:50] — PRD + Init + Design Kickoff

- **Type:** CODING
- **Status:** COMPLETED (stage ini)
- **Versi berjalan:** v0.01
- **Files touched:** /mnt/agents/output/2026-07-21_PRD-PesatBoard_FINAL.md, /mnt/agents/output/info.md, /mnt/agents/output/plan.md, /mnt/agents/work/pesat-board/app (git repo, init-webapp.sh), /mnt/agents/output/design/ (sedang ditulis designer agent)
- **Key decisions:**
  - Pola swarm dipakai; backend-building-swarm template (MySQL+Kimi auth) DITOLAK — tidak cocok VPS. Backend custom: Fastify + Prisma + PG16 + Socket.IO + Baileys, port 3400, PM2.
  - Shared repo dipindah ke /mnt/agents/work/pesat-board/app (memenuhi File Persistence Protocol).
  - Google login ditunda sampai user kasih OAuth Client ID/Secret (email/password dulu).
  - Bahasa UI: Indonesia. Asumsi "Role: tes" = yes (Owner/Admin/Member/Viewer).
- **Known issues:** none
- **Blockers:** none (menunggu design.md dari Pro_Designer background agent)
- **Next step:** Review design.md → scaffold branch + scaffold subagent → backend custom pass
- **Inspector:** PASSED
- **Backup location:** none yet (belum ada perubahan file existing)
- **coldstart.md stored at:** /mnt/agents/work/pesat-board/coldstart.md

## [2026-07-21 12:10] — Design PASSED + 3 Agent Paralel

- **Type:** CODING
- **Status:** IN PROGRESS
- **Versi berjalan:** v0.01
- **Files touched:** contracts/api-contract.md (master), deploy/nginx-board.conf, deploy/backup.sh, /mnt/agents/output/design/*.md (designer)
- **Key decisions:**
  - design.md lolos gate: violet #7C3AED brand pesat.ai, token WA lengkap, 9 halaman.
  - Kontrak API ditulis → commit master → scaffold branch di-align. Page agents membaca kontrak ini.
  - Backend agent: branch `backend`, HANYA folder server/ (Fastify+Prisma+PG+Socket.IO+Baileys), Node ESM TS.
  - Scaffold agent: branch `scaffold` — shared infra (TopNavbar/AppSidebar/Layout/api.ts/socket.ts/auth.tsx/versions.ts), routing 9 route, login page lengkap, PWA, assets (raster via image tool + SVG manual).
  - setup-local.sh dipanggil dengan REPO_PATH=/mnt/agents/work/pesat-board/app.
- **Known issues:** none
- **Blockers:** menunggu 3 agent selesai
- **Next step:** Stage 4 — grouping page branches (board-core / home-workspace / auth / inbox-settings-version), spawn page agents, merge scaffold+backend dulu
- **Inspector:** PASSED
- **Backup location:** none yet
- **coldstart.md stored at:** /mnt/agents/work/pesat-board/coldstart.md

## [2026-07-21 12:35] — Scaffold merged + 4 page agents paralel

- **Type:** CODING
- **Status:** IN PROGRESS
- **Versi berjalan:** v0.01
- **Files touched:** master kini = scaffold merged (commit 160fc7c); design/ 10 file final
- **Key decisions:**
  - Designer selesai 10 file (~1100 baris); brand diekstrak dari CSS pesat.ai asli. Agent designer & scaffold di-delete setelah deliver (slot bebas).
  - Scaffold: tsc + vite build PASS, PWA manifest+SW OK, login lengkap, assets programatik (PIL) + SVG manual.
  - Konvensi scaffold (Outlet nested routes, api.ts/socket.ts/auth.tsx, react-router v7, alias @/) dipakai semua page agents.
  - 4 branch page: board-core (kanban+card modal, terberat), home-workspace, auth-pages, inbox-settings-version. Page agents GANTI stub path sama → App.tsx tidak disentuh siapa pun.
  - Backend agent masih jalan (branch backend, server/ saja) — merge belakangan, bebas konflik.
  - deploy/ berisi nginx-board.conf, backup.sh, deploy-runbook.md, qa-checklist.md.
- **Known issues:** none
- **Blockers:** menunggu 4 page agents + backend agent
- **Next step:** merge semua branch → contract check → build → QA 3x → deploy
- **Inspector:** PASSED
- **Backup location:** none yet
- **coldstart.md stored at:** /mnt/agents/work/pesat-board/coldstart.md

## [2026-07-21 13:05] — Backend rescued & merged

- **Type:** CODING
- **Status:** COMPLETED (stage ini)
- **Versi berjalan:** v0.01
- **Files touched:** server/ (35 file) masuk master via commit a867aa4
- **Key decisions:**
  - Backend agent deliver: 35 file, QA pass (prisma validate/generate, tsc, smoke test socket.io). Baileys dipin 6.7.23 stabil.
  - INSIDENT: branch backend korup (fsck broken links, worktree dir hilang). Pemulihan: blob-walk manual `git cat-file` → 110 file 100% utuh di /tmp/backend-rescue → commit ulang server/ saja (branch lama dibuang karena berisi frontend usang pra-scaffold). Prosedur rescue terdokumentasi & teruji.
  - Worktree dirs agent berada di sandbox masing-masing (tak terlihat dari main); jalur commit ke shared repo terbukti bekerja.
- **Known issues:** reflog errors di git fsck (kosmetik, dari worktree entries basi — bersihkan saat semua agent selesai; JANGAN git worktree prune sembarangan)
- **Blockers:** menunggu 4 page agents
- **Next step:** terima 4 page branches → octopus merge final-build → build gate → fix → QA → deploy
- **Inspector:** PASSED
- **Backup location:** /tmp/backend-rescue (sementara, sudah ter-commit ke master)
- **coldstart.md stored at:** /mnt/agents/work/pesat-board/coldstart.md

## [2026-07-21 13:20] — INSIDENT: object store korup berulang → protokol pengiriman ganti

- **Type:** CODING
- **Status:** IN PROGRESS
- **Versi berjalan:** v0.01
- **Files touched:** /mnt/agents/work/pesat-board/bundles/
- **Key decisions:**
  - auth-pages selesai (register/forgot/404, tsc+build pass) TAPI root tree korup di shared repo.
  - Git bundle TIDAK可靠: bundle 12KB yang diverifikasi OK oleh agent ternyata kehilangan tree object yang sama (object store bersama memang kehilangan objek — bukan masalah transfer).
  - PROTOKOL BARU untuk SEMUA agent: kirim hasil via `git format-patch master --stdout --binary > /mnt/agents/work/pesat-board/bundles/<branch>.patch` (teks biasa, self-contained) + tar.gz file yang diubah sebagai cadangan. Apply di main: `git am` / `git apply`.
  - Stale worktree entries di-shared repo aman dihapus satu per satu dengan `git worktree remove --force <path>` SETELAH agent terkait selesai (JANGAN prune global).
- **Known issues:** branch auth-pages di repo masih menunjuk commit korup (akan ditimpa saat patch diapply ke branch bersih)
- **Blockers:** menunggu patch dari 4 page agents
- **Next step:** apply semua patch ke master via branch per-scope → build gate → QA → deploy
- **Inspector:** PASSED
- **Backup location:** /mnt/agents/work/pesat-board/bundles/
- **coldstart.md stored at:** /mnt/agents/work/pesat-board/coldstart.md

## [2026-07-24 18:30] — v1.07: Realtime WA reply otomatis di card modal

- **Type:** FIX
- **Status:** COMPLETED
- **Versi berjalan:** v1.07
- **Files touched:** `src/features/board/store.ts` — `refetchCommentsForCard()` added, `applyCommentNew()` rewritten
- **Key decisions:**
  - WA reply sudah bisa masuk board sejak v1.06 (LID fix). Masalah: komentar WA reply tidak muncul otomatis di card modal yang terbuka — user harus refresh atau tutup card.
  - Root cause: `applyCommentNew()` hanya melakukan append manual dari payload socket. Saat card terbuka, sering gagal karena ID clash dengan optimistic comment atau payload tidak lengkap.
  - Fix: ketika socket `comment:new` diterima dan card sedang terbuka → `refetchCommentsForCard()` ambil komentar fresh dari API → update `cardDetail.comments`.
  - `refetchCommentsForCard(cardId)` method baru memanggil `api.listComments(cardId)` dan apply ke store.
  - Fallback: jika refetch gagal, tetap append payload socket seperti sebelumnya.
  - Frontend di-build dan di-deploy ke VPS (dist → /var/www/pesat-board/app/).
- **Known issues:** none
- **Blockers:** none
- **Next step:** test end-to-end
- **Inspector:** PASSED
- **Backup location:** dist-v1.07.tar.gz di /tmp/ (VPS)
- **coldstart.md stored at:** D:\Claude Cowork\Pesat Board\extracted\src-extracted\pesat-board-src\coldstart.md

## [2026-07-21 13:45] — 3/4 page branch merged + build gate PASS + VPS groundwork

- **Type:** CODING
- **Status:** IN PROGRESS
- **Versi berjalan:** v0.01
- **Files touched:** master: auth-pages (4c6443e), home-workspace (fe9eb0a), inbox-settings-version (fbfac62); deploy/.env.production (BARU, mode 600)
- **Key decisions:**
  - Jalur artefak可靠: `/mnt/agents/output/rescue/` ( dua arah terverifikasi via marker) + `/mnt/agents/work/pesat-board/bundles/` (inkonsisten per-file — selalu cek keduanya).
  - Konflik api.ts (forgotPassword vs changePassword/updateProfile) → resolusi union manual.
  - Build check dini master (3 branch): tsc -b ✅, npm run build ✅, PWA ✅ (bundle 994KB — code-split nanti).
  - VPS groundwork selesai: /var/www/pesat-board/{app,server,uploads,wa-sessions,deploy}, DB pesatboard + user pesatboard dibuat, kredensial di deploy/.env.production (JANGAN commit ke git!).
  - Mount /mnt/agents flaky: operasi git kadang butuh retry (index.lock ENOENT sesaat) — retry 1-2x biasanya tembus.
- **Known issues:**
  - board-core agent belum selesai (terberat: kanban DnD + card modal).
  - Integrasi tertunda: BoardPage harus memanggil trackBoardVisit() dari features/home/recent.ts (kontrak dari home-workspace agent) — cek saat merge board-core.
  - Bundle JS 994KB → kandidat code-split pasca-MVP.
- **Blockers:** menunggu board-core
- **Next step:** merge board-core → final build → QA 3x → deploy board.pesat.ai
- **Inspector:** PASSED
- **Backup location:** /mnt/agents/output/rescue/ + bundles/ (artefak semua page agents)
- **coldstart.md stored at:** /mnt/agents/work/pesat-board/coldstart.md
