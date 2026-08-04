"use server";

import { revalidatePath } from "next/cache";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { statusOf, prioOf, IDAG, KUNDE_FARVER, erAdmin } from "@/lib/constants";
import { createNotification } from "@/lib/notifications";
import { sendEmailDetailed, activeTransport, effectiveFrom } from "@/lib/email";

/** Log ud. */
export async function logout() {
  await signOut({ redirectTo: "/login" });
}

async function actor() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke logget ind");
  // Læs rolle/navn fra DB, så fx en admin-promovering slår igennem med det samme
  // (uden at brugeren skal logge ind igen).
  const dbu = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, role: true },
  });
  return {
    id: session.user.id,
    navn: dbu?.name || session.user.name || "En bruger",
    role: dbu?.role || session.user.role || "Medarbejder",
  };
}

const HEX = /^#[0-9A-Fa-f]{6}$/;

async function naesteLedigeFarve(): Promise<string> {
  const brugte = new Set((await prisma.customer.findMany({ select: { color: true } })).map((c) => c.color));
  const ledig = KUNDE_FARVER.find((c) => !brugte.has(c));
  if (ledig) return ledig;
  const antal = await prisma.customer.count();
  return KUNDE_FARVER[antal % KUNDE_FARVER.length];
}

function plusDage(dato: string, n: number): string {
  return new Date(new Date(dato).getTime() + n * 86400000).toISOString().slice(0, 10);
}

function mentionNavne(tekst: string): string[] {
  const ud: string[] = [];
  const re = /@([A-ZÆØÅ][a-zæøå]+ [A-ZÆØÅ][a-zæøå]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tekst))) if (ud.indexOf(m[1]) < 0) ud.push(m[1]);
  return ud;
}

// Slå kundenavn + ansvarlige op til brug i notifikationer.
async function taskKontekst(taskId: string) {
  return prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      name: true,
      assignees: { select: { id: true } },
      group: { select: { board: { select: { customer: { select: { name: true } } } } } },
    },
  });
}

/** Ét-klik statusskifte (tabel, kanban-drop, panel). */
export async function setStatus(taskId: string, status: string) {
  const me = await actor();
  const ctx = await taskKontekst(taskId);
  if (!ctx) return;
  await prisma.task.update({ where: { id: taskId }, data: { status } });
  await prisma.activity.create({
    data: {
      taskId,
      actorId: me.id,
      text: me.navn + " ændrede status til " + status,
      color: statusOf(status).f,
      displayTime: "lige nu",
    },
  });

  // Notifikation når en opgave markeres færdig.
  if (status === "Færdig") {
    const kunde = ctx.group?.board?.customer?.name ?? null;
    await Promise.all(
      ctx.assignees
        .filter((a) => a.id !== me.id)
        .map((a) =>
          createNotification({
            recipientId: a.id,
            actor: me,
            text: me.navn + ' markerede "' + ctx.name + '" som færdig',
            color: "#16A34A",
            taskId,
            taskName: ctx.name,
            customerName: kunde,
          }),
        ),
    );
  }
  revalidatePath("/");
}

/** Skift prioritet. */
export async function setPriority(taskId: string, priority: string) {
  const me = await actor();
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true } });
  if (!task) return;
  await prisma.task.update({ where: { id: taskId }, data: { priority } });
  await prisma.activity.create({
    data: {
      taskId,
      actorId: me.id,
      text: me.navn + " satte prioritet til " + priority,
      color: prioOf(priority).f,
      displayTime: "lige nu",
    },
  });
  revalidatePath("/");
}

/** Flyt opgave mellem grupper / omorganisér rækkefølge (tabel-drag). */
export async function moveTask(taskId: string, targetGroupId: string, beforeId: string | null) {
  await actor();
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true } });
  if (!task) return;

  const targetTasks = await prisma.task.findMany({
    where: { groupId: targetGroupId },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  const ids = targetTasks.map((t) => t.id).filter((id) => id !== taskId);
  let idx = ids.length;
  if (beforeId) {
    const j = ids.indexOf(beforeId);
    if (j >= 0) idx = j;
  }
  ids.splice(idx, 0, taskId);

  await prisma.$transaction([
    prisma.task.update({ where: { id: taskId }, data: { groupId: targetGroupId } }),
    ...ids.map((id, i) => prisma.task.update({ where: { id }, data: { position: i } })),
  ]);
  revalidatePath("/");
}

/** Tilføj opgave i en gruppe. */
export async function addTask(groupId: string, navn: string) {
  const me = await actor();
  const rent = navn.trim();
  if (!rent) return;
  const antal = await prisma.task.count({ where: { groupId } });
  const task = await prisma.task.create({
    data: {
      name: rent,
      status: "Ikke startet",
      priority: "Medium",
      startDate: IDAG,
      endDate: plusDage(IDAG, 7),
      notes: "",
      position: antal,
      groupId,
      creatorId: me.id,
      assignees: { connect: { id: me.id } },
    },
  });
  await prisma.activity.create({
    data: { taskId: task.id, actorId: me.id, text: "Opgave oprettet af " + me.navn, color: "#C4C7CE", displayTime: "lige nu" },
  });
  revalidatePath("/");
}

/** Flueben på underopgave. */
export async function toggleSubtask(subtaskId: string) {
  await actor();
  const s = await prisma.subtask.findUnique({ where: { id: subtaskId } });
  if (!s) return;
  await prisma.subtask.update({ where: { id: subtaskId }, data: { done: !s.done } });
  revalidatePath("/");
}

/** Skriv kommentar (med @mentions → notifikationer + e-mail). */
export async function addComment(taskId: string, body: string) {
  const me = await actor();
  const tekst = body.trim();
  if (!tekst) return;

  const ctx = await taskKontekst(taskId);
  if (!ctx) return;
  const kunde = ctx.group?.board?.customer?.name ?? null;

  const navne = mentionNavne(tekst);
  const naevnte = navne.length
    ? await prisma.user.findMany({ where: { name: { in: navne } }, select: { id: true } })
    : [];

  await prisma.comment.create({
    data: {
      taskId,
      authorId: me.id,
      body: tekst,
      displayTime: "lige nu",
      mentions: { connect: naevnte.map((u) => ({ id: u.id })) },
    },
  });
  await prisma.activity.create({
    data: { taskId, actorId: me.id, text: me.navn + " skrev en kommentar", color: "#3355FF", displayTime: "lige nu" },
  });

  const naevntIds = new Set(naevnte.map((u) => u.id));

  // @mention-notifikationer.
  const mentionNotis = naevnte
    .filter((u) => u.id !== me.id)
    .map((u) =>
      createNotification({
        recipientId: u.id,
        actor: me,
        text: me.navn + ' nævnte dig i "' + ctx.name + '"',
        color: "#FF442B",
        taskId,
        taskName: ctx.name,
        customerName: kunde,
      }),
    );

  // Ny-kommentar-notifikationer til øvrige ansvarlige (som ikke er nævnt/afsender).
  const kommentarNotis = ctx.assignees
    .filter((a) => a.id !== me.id && !naevntIds.has(a.id))
    .map((a) =>
      createNotification({
        recipientId: a.id,
        actor: me,
        text: me.navn + ' skrev en kommentar på "' + ctx.name + '"',
        color: "#3355FF",
        taskId,
        taskName: ctx.name,
        customerName: kunde,
      }),
    );

  await Promise.all([...mentionNotis, ...kommentarNotis]);
  revalidatePath("/");
}

/** Opret ny kunde med standard-board og tre grupper. */
export async function createCustomer(navn: string, farve?: string) {
  const me = await actor();
  const rent = navn.trim();
  if (!rent) return null;
  const antal = await prisma.customer.count();
  const color = farve && HEX.test(farve) ? farve : await naesteLedigeFarve();
  const customer = await prisma.customer.create({
    data: {
      name: rent,
      short: rent.slice(0, 2).toUpperCase(),
      industry: "Ny kunde",
      color,
      position: antal,
      creatorId: me.id,
      boards: {
        create: {
          name: "Onboarding",
          position: 0,
          creatorId: me.id,
          groups: {
            create: [
              { name: "Denne uge", color: "#FF442B", position: 0 },
              { name: "Backlog", color: "#9E9E9E", position: 1 },
              { name: "Afsluttet", color: "#16A34A", position: 2 },
            ],
          },
        },
      },
    },
    include: { boards: { include: { groups: true } } },
  });
  revalidatePath("/");
  return { kundeId: customer.id, boardId: customer.boards[0].id };
}

/** Opret nyt board på en kunde med tre grupper. */
export async function createBoard(customerId: string, navn: string) {
  const me = await actor();
  const rent = navn.trim();
  if (!rent) return null;
  const antal = await prisma.board.count({ where: { customerId } });
  const board = await prisma.board.create({
    data: {
      name: rent,
      position: antal,
      customerId,
      creatorId: me.id,
      groups: {
        create: [
          { name: "Denne uge", color: "#FF442B", position: 0 },
          { name: "Backlog", color: "#9E9E9E", position: 1 },
          { name: "Afsluttet", color: "#16A34A", position: 2 },
        ],
      },
    },
  });
  revalidatePath("/");
  return { kundeId: customerId, boardId: board.id };
}

/** Vælg/ændr en kundes farve. */
export async function setCustomerColor(customerId: string, farve: string) {
  await actor();
  if (!HEX.test(farve)) return;
  await prisma.customer.update({ where: { id: customerId }, data: { color: farve } });
  revalidatePath("/");
}

/** Markér den aktuelle brugers notifikationer som læst. */
export async function markNotificationsRead() {
  const me = await actor();
  await prisma.notification.updateMany({ where: { userId: me.id, read: false }, data: { read: true } });
  revalidatePath("/");
}

// ================================================================
// SLET — kun ADMIN eller ejer/creator. Cascade rydder afhængige rækker.
// ================================================================
type SletResultat = { ok: boolean; reason?: string };

function maaSlette(creatorId: string | null | undefined, me: { id: string; role: string }): boolean {
  return erAdmin(me.role) || (!!creatorId && creatorId === me.id);
}

/** Slet en enkelt opgave (med underopgaver, kommentarer, notifikationer via cascade). */
export async function deleteTask(taskId: string): Promise<SletResultat> {
  const me = await actor();
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true, creatorId: true } });
  if (!task) return { ok: false, reason: "Opgaven findes ikke." };
  if (!maaSlette(task.creatorId, me)) return { ok: false, reason: "Du har ikke rettigheder til at slette denne opgave." };
  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath("/");
  return { ok: true };
}

/** Slet et board/projekt (med grupper, opgaver, kommentarer, notifikationer via cascade). */
export async function deleteBoard(boardId: string): Promise<SletResultat> {
  const me = await actor();
  const board = await prisma.board.findUnique({ where: { id: boardId }, select: { id: true, creatorId: true } });
  if (!board) return { ok: false, reason: "Boardet findes ikke." };
  if (!maaSlette(board.creatorId, me)) return { ok: false, reason: "Du har ikke rettigheder til at slette dette board." };
  await prisma.board.delete({ where: { id: boardId } });
  revalidatePath("/");
  return { ok: true };
}

/** Slet en kunde (med boards, grupper, opgaver, kommentarer, notifikationer via cascade). */
export async function deleteCustomer(customerId: string): Promise<SletResultat> {
  const me = await actor();
  const kunde = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true, creatorId: true } });
  if (!kunde) return { ok: false, reason: "Kunden findes ikke." };
  if (!maaSlette(kunde.creatorId, me)) return { ok: false, reason: "Du har ikke rettigheder til at slette denne kunde." };
  await prisma.customer.delete({ where: { id: customerId } });
  revalidatePath("/");
  return { ok: true };
}

/** Slå e-mail-notifikationer til/fra for den aktuelle bruger. */
export async function setEmailNotifications(enabled: boolean) {
  const me = await actor();
  await prisma.user.update({ where: { id: me.id }, data: { emailNotifications: enabled } });
  revalidatePath("/indstillinger");
  revalidatePath("/");
}

export type TestMailResultat = { ok: boolean; transport: string; from: string; to?: string; error?: string };

/** Send en testmail til brugeren selv (kun admin) — til fejlfinding af mail-transporten. */
export async function sendTestEmail(): Promise<TestMailResultat> {
  const me = await actor();
  const transport = activeTransport();
  const from = effectiveFrom();
  if (!erAdmin(me.role)) {
    return { ok: false, transport, from, error: "Kun administratorer kan sende testmail." };
  }
  const bruger = await prisma.user.findUnique({ where: { id: me.id }, select: { email: true, name: true } });
  if (!bruger?.email) {
    return { ok: false, transport, from, error: "Din bruger har ingen e-mailadresse." };
  }
  const fornavn = (bruger.name || "").split(" ")[0] || "der";
  const html = `<!doctype html><html lang="da"><body style="margin:0;background:#F7F8F9;font-family:'Instrument Sans',system-ui,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#181818;">
    <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
        <span style="display:inline-block;width:12px;height:12px;background:#FF442B;transform:rotate(45deg);"></span>
        <span style="font-size:17px;font-weight:600;letter-spacing:-0.01em;">thirdbase</span>
        <span style="font-size:12px;color:#9E9E9E;">· Projektstyring</span>
      </div>
      <div style="background:#fff;border:1px solid #E6E8EC;padding:28px;">
        <div style="font-size:19px;font-weight:600;">Testmail modtaget 🎉</div>
        <div style="margin-top:14px;font-size:14px;line-height:1.7;color:#4A4A4A;">
          Hej ${fornavn}. Hvis du kan læse denne mail, virker e-mail-notifikationer i thirdbase Projektstyring.
          Transport: <strong>${transport}</strong> · Afsender: <strong>${from}</strong>
        </div>
      </div>
    </div>
  </body></html>`;
  const text = `Hej ${fornavn}\n\nDette er en testmail fra thirdbase Projektstyring.\nHvis du kan læse den, virker e-mail-notifikationer.\n\nTransport: ${transport}\nAfsender: ${from}`;

  const res = await sendEmailDetailed({ to: bruger.email, subject: "Testmail fra thirdbase Projektstyring", html, text });
  return { ok: res.ok, transport: res.transport, from: res.from, to: bruger.email, error: res.error };
}
