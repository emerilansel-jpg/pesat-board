# API Contract — Pesat Board (frontend ↔ backend)

Backend: Fastify + Prisma + Socket.IO di `server/` (branch `backend`). Base URL: same-origin `/api` (dev Vite proxy → `http://localhost:3400`). Socket.IO: same-origin path default `/socket.io`.

## Auth
- JWT Bearer di header `Authorization: Bearer <token>`. Token disimpan di localStorage `pb_token`.
- `POST /api/auth/register` `{name,email,password}` → `{token,user}` (otomatis dibuatkan workspace personal)
- `POST /api/auth/login` `{email,password}` → `{token,user}`
- `GET /api/auth/me` → `{user}` (dipakai saat bootstrap app)
- `POST /api/auth/google` → 501 (coming soon — tombol Google tampil disabled/soon)
- Error: `{message}` dengan status 4xx/5xx.

`user = {id,name,email,avatarUrl,waNumber,createdAt}`

## Realtime (socket.io-client)
- Connect dengan `auth: {token}`. Auto-join room personal `user:{id}` (server-side).
- Client emit: `board:join` `{boardId}` · `board:leave` `{boardId}`.
- Server → client (room board): `card:created|card:updated|card:moved|card:deleted` (payload card), `list:created|list:updated|list:moved|list:archived`, `comment:new` (comment lengkap + author + mentions), `comment:wa-status` `{commentId,status}`, `checklist:*`, `board:updated`, `activity:new`.
- Personal: `wa:qr` `{qr}` (string untuk qrcode.react), `wa:status` `{status:"DISCONNECTED"|"CONNECTING"|"CONNECTED", phone?}`, `wa:inbox-new` `{count}`.
- Presence (nice-to-have): server boleh emit `presence:update` `{boardId,userIds[]}`; frontend tampilkan avatar online.

## REST (semua prefix `/api`, JWT kecuali auth & health)
- Workspaces: `GET /workspaces` → `{workspaces:[{id,name,slug,role,boards:[{id,title,slug,background,archived,starred}]}]}` · `POST /workspaces {name}` · `GET /workspaces/:id` → `{workspace,boards,members:[{user,role}]}` · `PATCH /workspaces/:id` · `DELETE /workspaces/:id` (owner) · `POST /workspaces/:id/invite {email,role}` → `{inviteLink}` · `POST /invites/:token/accept` · `PATCH /workspaces/:id/members/:userId {role}` · `DELETE /workspaces/:id/members/:userId`
- Boards: `POST /workspaces/:id/boards {title,background}` → board (auto 3 list: To Do/Doing/Done) · `GET /boards/:id` → `{board, lists:[{id,title,position,cards:[cardSummary]}], labels, members:[{user,role}], myRole, starred}` · `PATCH /boards/:id {title?,background?,archived?}` · `DELETE /boards/:id` · `POST /boards/:id/star` / `DELETE /boards/:id/star`
- `cardSummary = {id,listId,title,position,dueDate,coverColor,labels:[label],assignees:[user],checklistTotal,checklistDone,commentCount,hasWaComment,attachmentCount,hasDescription}`
- Lists: `POST /boards/:id/lists {title}` · `PATCH /lists/:id {title?,archived?}` · `POST /lists/:id/move {position}`
- Cards: `POST /lists/:id/cards {title}` → card · `GET /cards/:id` → `{card:{...full,description},assignees,labels,checklists:[{id,title,position,items:[{id,text,done,position}]}],attachments,comments:[comment]}` · `PATCH /cards/:id {title?,description?,dueDate?,coverColor?,archived?}` · `POST /cards/:id/move {listId,position}` · `DELETE /cards/:id` · `POST|DELETE /cards/:id/assignees/:userId` · `POST|DELETE /cards/:id/labels/:labelId`
- `comment = {id,cardId,author:{id,name,avatarUrl},body,source:"APP"|"WA",waStatus?:"QUEUED"|"SENT"|"DELIVERED"|"READ"|"FAILED",parentId?,mentions:[user],createdAt}`
- Comments: `GET /cards/:id/comments` · `POST /cards/:id/comments {body,mentions:[userId]}` → comment (mention memicu kirim WA) · `PATCH|DELETE /comments/:id` (author)
- Checklists: `POST /cards/:id/checklists {title}` · `PATCH|DELETE /checklists/:id` · `POST /checklists/:id/items {text}` · `PATCH /items/:id {text?,done?}` · `DELETE /items/:id`
- Labels: `POST /boards/:id/labels {name,color}` · `PATCH|DELETE /labels/:id`
- Attachments: `POST /cards/:id/attachments` (multipart field `file`) → attachment · file diakses via `/uploads/<path>`
- Activities: `GET /boards/:id/activities?limit=50` → `{activities:[{id,actor:{name},type,payload,createdAt}]}`
- Search: `GET /search?q=&workspaceId=` → `{cards:[{id,title,boardId,boardTitle,listTitle}],boards:[...]}`
- WhatsApp: `POST /wa/connect` (mulai pairing; QR via socket `wa:qr`) · `GET /wa/status` → `{status,phone?}` · `POST /wa/disconnect` · `GET /wa/inbox` → `{items:[{id,fromPhone,text,mediaPath?,createdAt,suggestion?}]}` · `POST /wa/inbox/:id/attach {cardId}` · `POST /wa/inbox/:id/ignore`
- `GET /health` → `{ok:true}`

## Posisi & reorder
`position` float; item baru = max+1024; move mengirim posisi target (rata-rata tetangga). Frontend reorder optimistik lalu PATCH/POST move.

## Version page (frontend saja)
`/version` me-render `src/data/versions.ts` (di-generate dari `VERSIONS.md` root repo — jangan edit manual; jalankan `node scripts/gen-versions.mjs` bila ada, atau generate inline sesuai isi VERSIONS.md).
