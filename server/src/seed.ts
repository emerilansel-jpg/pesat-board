import bcrypt from 'bcryptjs';
import { prisma } from './db.js';
import { nextPosition } from './positions.js';

const DEMO_PASSWORD = 'demo1234';

async function ensureUser(email: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`  - user ${email} sudah ada, skip`);
    return existing;
  }
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await prisma.user.create({ data: { email, name, passwordHash } });
  console.log(`  + user ${email} dibuat`);
  return user;
}

async function main() {
  console.log('Seeding data demo...');

  const andi = await ensureUser('andi@pesat.ai', 'Andi');
  const budi = await ensureUser('budi@pesat.ai', 'Budi');

  // Workspace Demo (idempotent: cari membership andi dengan nama "Demo")
  let workspace = await prisma.workspace.findFirst({
    where: { name: 'Demo', members: { some: { userId: andi.id } } },
  });
  if (workspace) {
    console.log('  - workspace "Demo" sudah ada, skip');
  } else {
    workspace = await prisma.workspace.create({
      data: {
        name: 'Demo',
        slug: 'demo',
        createdById: andi.id,
        members: {
          create: [
            { userId: andi.id, role: 'OWNER' },
            { userId: budi.id, role: 'MEMBER' },
          ],
        },
      },
    });
    console.log('  + workspace "Demo" dibuat');
  }

  // Board "Proyek Contoh"
  let board = await prisma.board.findFirst({ where: { workspaceId: workspace.id, title: 'Proyek Contoh' } });
  if (board) {
    console.log('  - board "Proyek Contoh" sudah ada, skip');
  } else {
    board = await prisma.board.create({
      data: {
        workspaceId: workspace.id,
        title: 'Proyek Contoh',
        slug: 'proyek-contoh',
        background: '#0d9488',
        labels: {
          create: [
            { name: 'Bug', color: '#ef4444' },
            { name: 'Fitur', color: '#3b82f6' },
            { name: 'Riset', color: '#8b5cf6' },
            { name: 'Urgent', color: '#f59e0b' },
          ],
        },
        lists: {
          create: [
            { title: 'To Do', position: nextPosition(0) },
            { title: 'Doing', position: nextPosition(1024) },
            { title: 'Done', position: nextPosition(2048) },
          ],
        },
      },
      include: { lists: { orderBy: { position: 'asc' } }, labels: true },
    });
    console.log('  + board "Proyek Contoh" dibuat (3 list, 4 label)');
  }

  const [todo, doing, done] = await prisma.list.findMany({
    where: { boardId: board.id },
    orderBy: { position: 'asc' },
  });
  const labels = await prisma.label.findMany({ where: { boardId: board.id } });
  const labelByName = Object.fromEntries(labels.map((l) => [l.name, l.id]));

  const hasCards = (await prisma.card.count({ where: { list: { boardId: board.id } } })) > 0;
  if (hasCards) {
    console.log('  - card demo sudah ada, skip');
  } else if (todo && doing && done) {
    const inDays = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

    async function addCard(opts: {
      listId: string;
      title: string;
      position: number;
      description?: string;
      dueDate?: Date;
      labels?: string[];
      assignees?: string[];
      checklists?: { title: string; items: { text: string; done?: boolean }[] }[];
    }) {
      const card = await prisma.card.create({
        data: {
          listId: opts.listId,
          title: opts.title,
          position: opts.position,
          description: opts.description ?? '',
          dueDate: opts.dueDate,
          createdById: andi.id,
          labels: { create: (opts.labels ?? []).map((labelId) => ({ labelId })) },
          assignees: { create: (opts.assignees ?? []).map((userId) => ({ userId })) },
        },
      });
      for (const [i, cl] of (opts.checklists ?? []).entries()) {
        await prisma.checklist.create({
          data: {
            cardId: card.id,
            title: cl.title,
            position: nextPosition(i * 1024),
            items: {
              create: cl.items.map((it, j) => ({ text: it.text, done: it.done ?? false, position: nextPosition(j * 1024) })),
            },
          },
        });
      }
      return card;
    }

    const c1 = await addCard({
      listId: todo.id,
      title: 'Riset kebutuhan pengguna',
      position: nextPosition(0),
      description: 'Wawancara 5 calon pengguna untuk memvalidasi alur kanban + WhatsApp.',
      dueDate: inDays(7),
      labels: [labelByName['Riset']!],
      assignees: [andi.id],
      checklists: [
        {
          title: 'Persiapan',
          items: [
            { text: 'Susun pertanyaan wawancara', done: true },
            { text: 'Rekrut responden' },
            { text: 'Jadwalkan sesi' },
          ],
        },
      ],
    });

    const c2 = await addCard({
      listId: todo.id,
      title: 'Desain halaman board',
      position: nextPosition(1024),
      description: 'Wireframe + mockup tampilan board, list, dan kartu.',
      dueDate: inDays(10),
      labels: [labelByName['Fitur']!],
      assignees: [budi.id],
    });

    const c3 = await addCard({
      listId: doing.id,
      title: 'Integrasi WhatsApp gateway',
      position: nextPosition(0),
      description: 'Sinkron komentar kartu <-> chat WhatsApp (2 arah).',
      dueDate: inDays(3),
      labels: [labelByName['Fitur']!, labelByName['Urgent']!],
      assignees: [andi.id, budi.id],
      checklists: [
        {
          title: 'Cakupan MVP',
          items: [
            { text: 'Kirim notifikasi mention', done: true },
            { text: 'Balas via reply pesan', done: true },
            { text: 'Routing hashtag #board-card' },
            { text: 'Lampiran media' },
          ],
        },
      ],
    });

    await addCard({
      listId: doing.id,
      title: 'Perbaiki bug drag & drop kartu',
      position: nextPosition(1024),
      description: 'Kartu kadang melompat ke posisi awal saat list panjang.',
      labels: [labelByName['Bug']!],
      assignees: [budi.id],
    });

    await addCard({
      listId: done.id,
      title: 'Setup CI/CD pipeline',
      position: nextPosition(0),
      description: 'Build, test, dan deploy otomatis ke VPS.',
      labels: [labelByName['Fitur']!],
      assignees: [andi.id],
    });

    const c6 = await addCard({
      listId: done.id,
      title: 'Rilis internal v0.1',
      position: nextPosition(1024),
      description: 'Rilis perdana untuk dipakai tim internal.',
      labels: [labelByName['Urgent']!],
      assignees: [andi.id, budi.id],
    });

    await prisma.comment.create({
      data: {
        cardId: c3.id,
        authorId: andi.id,
        body: 'Gateway WA sudah bisa kirim notifikasi mention. Besok lanjut routing hashtag.',
        mentions: { create: [{ userId: budi.id }] },
      },
    });
    await prisma.comment.create({
      data: {
        cardId: c6.id,
        authorId: budi.id,
        body: 'v0.1 sudah dipasang di VPS, silakan dicoba dan catat bug di list To Do.',
      },
    });
    await prisma.activity.create({
      data: { boardId: board.id, actorId: andi.id, type: 'board.created', payload: { boardId: board.id, boardTitle: board.title } },
    });
    console.log('  + 6 card demo + 2 komentar dibuat');
    void c1;
    void c2;
  }

  console.log('Seed selesai.');
}

main()
  .catch((err) => {
    console.error('Seed gagal:', err);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
