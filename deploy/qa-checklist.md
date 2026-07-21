# QA Checklist — Pesat Board (Stage 5, minimal 3 loop)

## A. Auth & Workspace
- [ ] Register → auto workspace personal → masuk home
- [ ] Login salah password → pesan error inline (bukan crash)
- [ ] Logout → kembali /login; akses route ter-auth tanpa token → redirect /login
- [ ] Buat workspace baru; rename; (owner) hapus dengan konfirmasi
- [ ] Invite: buat link → user lain accept → muncul di members dengan role benar
- [ ] Role: Viewer tidak bisa mutasi (UI disable + API 403); Member tidak bisa kelola board settings

## B. Kanban core
- [ ] Buat board (warna/gradient/foto) → auto 3 list To Do/Doing/Done
- [ ] Tambah list, rename inline (Enter/Esc), drag list horizontal
- [ ] Rapid add card (Enter terus menambah), edit judul inline
- [ ] Drag card dalam list (reorder) & antar-list; posisi persist setelah refresh
- [ ] Star board (di board & tile home); archive board → hilang dari home
- [ ] Background board ganti via menu board; tile home ikut berubah
- [ ] Board menu slide-over: about, activity, archive (restore card)

## C. Card detail
- [ ] Modal terbuka di atas board; URL ?card= bisa di-refresh/share
- [ ] Deskripsi markdown render + edit inline
- [ ] Due date: set, badge state (default/segera/lewat/selesai), hapus
- [ ] Label: buat (10 warna), assign, toggle tampilan chip/strip di muka kartu
- [ ] Assign member multi; avatar muncul di kartu
- [ ] Checklist: tambah, centang (progress bar di kartu & modal update), hapus item
- [ ] Attachment: upload gambar/pdf → tampil di card & badge count; lightbox gambar
- [ ] Archive card → masuk daftar arsip → restore
- [ ] Activity log mencatat semua aksi di atas

## D. Comment + WhatsApp
- [ ] Comment biasa tampil dengan avatar & waktu (date-fns, id locale)
- [ ] @mention autocomplete member; mention tersimpan (chip di comment)
- [ ] WA OFF: mention tidak mengirim apa pun
- [ ] WA ON (switch): WaMentionPreview muncul; kirim → WA sampai ke HP penerima dari nomor pengirim; format pesan sesuai (nama, card, board, instruksi reply/hashtag)
- [ ] Tick berubah ✓ → ✓✓ → biru saat dibaca (receipt)
- [ ] Balas WA (reply pesan) → masuk sebagai comment source WA (strip hijau, ter-quote) di card yang benar
- [ ] Kirim WA baru dengan `#boardslug-cardslug` → comment masuk card benar
- [ ] Hashtag salah/ambigu → masuk Inbox; attach manual ke card → jadi comment; ignore bekerja
- [ ] Foto/dok/audio dari WA → jadi attachment + comment media
- [ ] Komentar WA dari user lain muncul realtime tanpa refresh

## E. Realtime & presence
- [ ] 2 tab/user: drag card di A → bergerak animasi di B tanpa refresh
- [ ] Comment baru muncul di B; checklist toggle sinkron
- [ ] Presence avatar di navbar board saat user lain buka board yang sama
- [ ] Reconnect: matikan backend 10 detik → banner reconnect → data sinkron lagi

## F. Settings & Inbox
- [ ] Ganti nama & avatar; tersimpan
- [ ] Tab WhatsApp: tombol Hubungkan → QR muncul (countdown, kedaluwarsa, muat ulang) → scan dari HP → status Terhubung + nomor; tombol Putuskan bekerja
- [ ] Inbox: list pesan, chip hashtag, attach/ignore, badge navbar turun setelah attach
- [ ] /version: render dari versions.ts, versi teratas = terkini, badge tipe, link footer bekerja

## G. PWA & Mobile (S21 FE ~360-412px)
- [ ] Install prompt / Add to Home Screen → icon benar, splash benar, standalone
- [ ] Board mobile: snap-scroll list, FAB composer, card modal full-screen sheet
- [ ] Bottom nav di route non-board; safe-area tidak tertutup
- [ ] Offline: app shell tetap terbuka + banner offline (API gagal graceful)

## H. Non-fungsional
- [ ] npm run build bersih (tsc 0 error); tidak ada console.error di halaman utama
- [ ] Lighthouse mobile ≥ 85 performance di /login
- [ ] API health OK; latency GET board < 300ms di VPS
- [ ] Password ter-hash (cek DB); endpoint mutasi tanpa token → 401
- [ ] Backup cron terpasang dan uji 1x jalan manual
