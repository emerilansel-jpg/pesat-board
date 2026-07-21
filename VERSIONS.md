# VERSIONS — Pesat Board

## v1.02 — 21 Jul 2026 — FIX
- Fix: halaman Starred kini menampilkan board berbintang (backend mengirim flag starred per user)
- Fix: tautan "Terakhir dilihat" memakai slug board yang benar

## v1.01 — 21 Jul 2026 — FIX
- Fix kritis: halaman board tidak lagi blank (assignees/labels dinormalisasi, path aset absolute, Avatar tahan data tak lengkap)
- Fix kritis: response backend disamakan dengan kontrak frontend (board/card detail, search, bare objects)
- Invite link kini berfungsi (halaman terima undangan /invite/:token)
- Menu "Buat" di navbar aktif (buat board/workspace dari halaman mana pun)
- Sinkron realtime checklist antar pengguna; 401 auto-logout; halaman Starred aktif; /version bisa diakses publik
- Preferensi "kirim mention sebagai WhatsApp" dipakai komposer komentar; reconnect board tanpa flicker

## v1.00 — 21 Jul 2026 — MAJOR
- Rilis perdana Pesat Board di board.pesat.ai
- Kanban ala Trello: workspace, board (warna/gradient/foto), list, card, drag & drop, label, checklist, due date, attachment, assign member, comment + @mention, activity log, archive, search, star board — semuanya unlimited
- WhatsApp dua arah di comment: koneksi QR per user (Linked Devices), mention @nama kirim WA dari nomor pengirim, balas via reply/hashtag #board-card, media jadi attachment, WA Inbox untuk pesan belum ter-route, status tick ✓✓ biru
- Realtime multi-user (Socket.IO): drag card, comment, checklist langsung sinkron + presence
- Auth email/password + role Owner/Admin/Member/Viewer, invite via link
- PWA installable (mobile-first, diuji S21 FE), branding pesat.ai, halaman /version

## v0.01 — 21 Jul 2026 — MAJOR
- Initial setup: PRD, arsitektur, keputusan stack & WhatsApp engine
- Project scaffolding dimulai
