import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/db";
import { MDR, readableSize, dagsDato } from "@/lib/constants";
import { beregnDashboard } from "@/lib/dashboard";
import type { AppData, KundeDTO, OpgaveDTO, FilDTO } from "@/lib/types";

// Loader hele datatræet + den aktuelle brugers notifikationer i tre parallelle
// queries. Kun de felter UI'et bruger vælges. Dashboard + mig udledes lokalt.
export async function loadAppData(currentUserId: string): Promise<AppData> {
  const [users, customers, notifikationer] = await withDbRetry(() => Promise.all([
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
                    // VIGTIGT: 'data'-kolonnen (filens bytes) hentes ALDRIG her — kun metadata.
                    files: {
                      orderBy: { createdAt: "asc" },
                      select: { id: true, name: true, type: true, meta: true, size: true, mime: true, uploadedById: true, uploaderName: true, createdAt: true },
                    },
                    comments: {
                      orderBy: { createdAt: "asc" },
                      select: { id: true, body: true, displayTime: true, authorId: true, authorName: true },
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
  ]), "loadAppData");

  const brugerNavn = new Map(users.map((u) => [u.id, u.name] as const));

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
              u: c.authorId,
              // Levende navn hvis forfatteren stadig findes; ellers det historiske navn.
              navn: (c.authorId ? brugerNavn.get(c.authorId) : null) ?? c.authorName ?? "Tidligere bruger",
              tid: c.displayTime || "lige nu",
              tekst: c.body,
            })),
            filer: t.files.map((f): FilDTO => {
              const harData = f.size != null;
              const dato = f.createdAt ? `${f.createdAt.getDate()}. ${MDR[f.createdAt.getMonth()]}` : "";
              // Levende navn hvis uploaderen stadig findes; ellers det historiske navn.
              const uploaderNavn = (f.uploadedById ? brugerNavn.get(f.uploadedById) : null) ?? f.uploaderName ?? "Ukendt";
              const meta = harData
                ? [uploaderNavn, readableSize(f.size!), dato].filter(Boolean).join(" · ")
                : f.meta;
              return { id: f.id, navn: f.name, type: f.type, meta, harData, uploaderId: f.uploadedById, bytes: f.size };
            }),
            log: t.activities.map((a) => ({ tekst: a.text, tid: a.displayTime || "lige nu", farve: a.color })),
          }),
        ),
      })),
    })),
  }));

  const migRow = users.find((u) => u.id === currentUserId);

  // Dags dato beregnes ÉN gang server-side og sendes med til klienten, så begge
  // sider bruger samme dato — også hen over midnat.
  const idag = dagsDato();

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
    idag,
    dashboard: beregnDashboard(kunder, idag),
  };
}
