import { prisma } from "@/lib/prisma";
import { IDAG } from "@/lib/constants";
import type { AppData, KundeDTO, OpgaveDTO, DashboardKortDTO } from "@/lib/types";

// Aggregerer ét dashboard-kort pr. kunde — udelukkende server-side via Prisma
// (count + findMany med relations-where), aldrig i browseren.
export async function loadCustomerDashboard(): Promise<DashboardKortDTO[]> {
  const customers = await prisma.customer.findMany({
    orderBy: { position: "asc" },
    include: {
      _count: { select: { boards: true } },
      boards: { orderBy: { position: "asc" }, take: 1, select: { id: true } },
    },
  });

  return Promise.all(
    customers.map(async (c) => {
      const where = { group: { board: { customerId: c.id } } };
      const [opgaver, faerdige, overskredne, naeste] = await Promise.all([
        prisma.task.count({ where }),
        prisma.task.count({ where: { ...where, status: "Færdig" } }),
        prisma.task.count({ where: { ...where, status: { not: "Færdig" }, endDate: { lt: IDAG } } }),
        prisma.task.findMany({
          where: { ...where, status: { not: "Færdig" } },
          orderBy: [{ endDate: "asc" }],
          take: 3,
          select: { id: true, name: true, endDate: true, group: { select: { boardId: true } } },
        }),
      ]);
      const procent = opgaver > 0 ? Math.round((faerdige / opgaver) * 100) : 0;
      return {
        id: c.id,
        navn: c.name,
        kort: c.short,
        farve: c.color,
        boards: c._count.boards,
        opgaver,
        faerdige,
        procent,
        overskredne,
        foersteBoardId: c.boards[0]?.id ?? null,
        naeste: naeste.map((t) => ({ id: t.id, navn: t.name, slut: t.endDate, boardId: t.group.boardId })),
      };
    }),
  );
}

// Loader hele datatræet (brugere, kunder → boards → grupper → opgaver med
// underopgaver, kommentarer, filer og log) + den aktuelle brugers notifikationer.
export async function loadAppData(currentUserId: string): Promise<AppData> {
  const [users, customers, notifikationer, mig, dashboard] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.customer.findMany({
      orderBy: { position: "asc" },
      include: {
        boards: {
          orderBy: { position: "asc" },
          include: {
            groups: {
              orderBy: { position: "asc" },
              include: {
                tasks: {
                  orderBy: { position: "asc" },
                  include: {
                    assignees: { orderBy: { createdAt: "asc" }, select: { id: true } },
                    subtasks: { orderBy: { position: "asc" } },
                    files: { orderBy: { id: "asc" } },
                    comments: {
                      orderBy: { createdAt: "asc" },
                      include: { author: { select: { id: true } } },
                    },
                    activities: { orderBy: { createdAt: "desc" } },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.notification.findMany({
      where: { userId: currentUserId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findUnique({ where: { id: currentUserId } }),
    loadCustomerDashboard(),
  ]);

  const kunder: KundeDTO[] = customers.map((k) => ({
    id: k.id,
    navn: k.name,
    kort: k.short,
    branche: k.industry,
    farve: k.color,
    creatorId: k.creatorId,
    boards: k.boards.map((b) => ({
      id: b.id,
      navn: b.name,
      creatorId: b.creatorId,
      grupper: b.groups.map((g) => ({
        id: g.id,
        navn: g.name,
        farve: g.color,
        opgaver: g.tasks.map(
          (t): OpgaveDTO => ({
            id: t.id,
            navn: t.name,
            ansvarlige: t.assignees.map((a) => a.id),
            status: t.status,
            prioritet: t.priority,
            start: t.startDate,
            slut: t.endDate,
            noter: t.notes,
            creatorId: t.creatorId,
            underopgaver: t.subtasks.map((s) => ({ id: s.id, navn: s.name, faerdig: s.done })),
            kommentarer: t.comments.map((c) => ({
              id: c.id,
              u: c.author.id,
              tid: c.displayTime || "lige nu",
              tekst: c.body,
            })),
            filer: t.files.map((f) => ({ navn: f.name, type: f.type, meta: f.meta })),
            log: t.activities.map((a) => ({ tekst: a.text, tid: a.displayTime || "lige nu", farve: a.color })),
          }),
        ),
      })),
    })),
  }));

  return {
    brugere: users.map((u) => ({
      id: u.id,
      navn: u.name,
      rolle: u.role,
      ini: u.initials,
      f: u.color,
      email: u.email,
      image: u.image,
    })),
    kunder,
    notifikationer: notifikationer.map((n) => ({
      id: n.id,
      tekst: n.text,
      tid: n.time,
      farve: n.color,
      read: n.read,
    })),
    mig: mig
      ? { id: mig.id, navn: mig.name, rolle: mig.role, ini: mig.initials, f: mig.color, email: mig.email }
      : { id: currentUserId, navn: "Ukendt", rolle: "Medarbejder", ini: "?", f: "#3355FF", email: "" },
    dashboard,
  };
}
