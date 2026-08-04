import { prisma } from "@/lib/prisma";
import { IDAG } from "@/lib/constants";
import type { AppData, KundeDTO, OpgaveDTO, DashboardKortDTO } from "@/lib/types";

// Dashboard-kortene beregnes fra det allerede-indlæste datatræ (nul ekstra DB-kald)
// i stedet for ~23 per-kunde count-queries. Aggregeringen er in-memory over de
// opgaver vi alligevel henter til appen.
function beregnDashboard(kunder: KundeDTO[]): DashboardKortDTO[] {
  return kunder.map((k) => {
    let opgaver = 0;
    let faerdige = 0;
    let overskredne = 0;
    const aabne: { id: string; navn: string; slut: string | null; boardId: string }[] = [];
    for (const b of k.boards) {
      for (const g of b.grupper) {
        for (const o of g.opgaver) {
          opgaver++;
          if (o.status === "Færdig") {
            faerdige++;
          } else {
            if (o.slut && o.slut < IDAG) overskredne++;
            aabne.push({ id: o.id, navn: o.navn, slut: o.slut, boardId: b.id });
          }
        }
      }
    }
    aabne.sort((a, b) => ((a.slut || "￿") < (b.slut || "￿") ? -1 : (a.slut || "￿") > (b.slut || "￿") ? 1 : 0));
    return {
      id: k.id,
      navn: k.navn,
      kort: k.kort,
      farve: k.farve,
      boards: k.boards.length,
      opgaver,
      faerdige,
      procent: opgaver > 0 ? Math.round((faerdige / opgaver) * 100) : 0,
      overskredne,
      foersteBoardId: k.boards[0]?.id ?? null,
      naeste: aabne.slice(0, 3),
    };
  });
}

// Loader hele datatræet + den aktuelle brugers notifikationer i tre parallelle
// queries. Kun de felter UI'et bruger vælges. Dashboard + mig udledes lokalt.
export async function loadAppData(currentUserId: string): Promise<AppData> {
  const [users, customers, notifikationer] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, image: true, initials: true, color: true, role: true, email: true },
    }),
    prisma.customer.findMany({
      orderBy: { position: "asc" },
      select: {
        id: true,
        name: true,
        short: true,
        industry: true,
        color: true,
        creatorId: true,
        boards: {
          orderBy: { position: "asc" },
          select: {
            id: true,
            name: true,
            creatorId: true,
            groups: {
              orderBy: { position: "asc" },
              select: {
                id: true,
                name: true,
                color: true,
                tasks: {
                  orderBy: { position: "asc" },
                  select: {
                    id: true,
                    name: true,
                    status: true,
                    priority: true,
                    startDate: true,
                    endDate: true,
                    notes: true,
                    creatorId: true,
                    assignees: { orderBy: { createdAt: "asc" }, select: { id: true } },
                    subtasks: { orderBy: { position: "asc" }, select: { id: true, name: true, done: true } },
                    files: { orderBy: { id: "asc" }, select: { name: true, type: true, meta: true } },
                    comments: {
                      orderBy: { createdAt: "asc" },
                      select: { id: true, body: true, displayTime: true, authorId: true },
                    },
                    activities: { orderBy: { createdAt: "desc" }, select: { text: true, displayTime: true, color: true } },
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
      select: { id: true, text: true, time: true, color: true, read: true },
    }),
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
            kommentarer: t.comments.map((c) => ({ id: c.id, u: c.authorId, tid: c.displayTime || "lige nu", tekst: c.body })),
            filer: t.files.map((f) => ({ navn: f.name, type: f.type, meta: f.meta })),
            log: t.activities.map((a) => ({ tekst: a.text, tid: a.displayTime || "lige nu", farve: a.color })),
          }),
        ),
      })),
    })),
  }));

  const migRow = users.find((u) => u.id === currentUserId);

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
    notifikationer: notifikationer.map((n) => ({ id: n.id, tekst: n.text, tid: n.time, farve: n.color, read: n.read })),
    mig: migRow
      ? { id: migRow.id, navn: migRow.name, rolle: migRow.role, ini: migRow.initials, f: migRow.color, email: migRow.email }
      : { id: currentUserId, navn: "Ukendt", rolle: "Medarbejder", ini: "?", f: "#3355FF", email: "" },
    dashboard: beregnDashboard(kunder),
  };
}
