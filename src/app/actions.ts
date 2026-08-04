"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  statusOf,
  prioOf,
  dtoTekst,
  IDAG,
  MDR,
  KUNDE_FARVER,
  erAdmin,
  initialerAf,
  farveForNavn,
  readableSize,
  filTilladt,
  filTypeLabel,
  MAX_FIL_BYTES,
  MAX_TASK_BYTES,
} from "@/lib/constants";
import { createNotification } from "@/lib/notifications";
import { sendEmailDetailed, activeTransport, effectiveFrom } from "@/lib/email";
import { withDbRetry } from "@/lib/db";
import { appUrl } from "@/lib/appUrl";
import type { FilDTO } from "@/lib/types";

/** Log ud. */
export async function logout() {
  await signOut({ redirectTo: "/login" });
}

async function actor() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke logget ind");
  // Læs rolle/navn fra DB, så fx en admin-promovering slår igennem med det samme
  // (uden at brugeren skal logge ind igen). withDbRetry: overlever Neon cold start —
  // og da hver server action starter med actor(), dækker det cold start for dem alle.
  const dbu = await withDbRetry(
    () => prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, role: true } }),
    "actor",
  );
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
}

const DATO_RE = /^\d{4}-\d{2}-\d{2}$/;

function gyldigDato(d: string): boolean {
  if (!DATO_RE.test(d)) return false;
  const t = Date.parse(d);
  if (Number.isNaN(t)) return false;
  // Afvis fx 2026-02-30 (rulles ellers over): tjek at komponenterne matcher.
  return new Date(d).toISOString().slice(0, 10) === d;
}

/** Ret start-/slutdato på en opgave. null = ingen dato. Samme rettighedsmodel som
 *  de øvrige felt-mutationer (enhver logget-ind bruger). Ingen e-mail. */
export async function updateTaskDates(
  taskId: string,
  dates: { startDate: string | null; endDate: string | null },
): Promise<{ ok: boolean; reason?: string }> {
  const me = await actor();
  const start = dates.startDate;
  const end = dates.endDate;

  if (start !== null && !gyldigDato(start)) return { ok: false, reason: "Ugyldig startdato." };
  if (end !== null && !gyldigDato(end)) return { ok: false, reason: "Ugyldig slutdato." };
  if (start !== null && end !== null && end < start) {
    return { ok: false, reason: "Slutdato kan ikke ligge før startdato." };
  }

  const task = await withDbRetry(
    () => prisma.task.findUnique({ where: { id: taskId }, select: { id: true, startDate: true, endDate: true } }),
    "updateTaskDates:read",
  );
  if (!task) return { ok: false, reason: "Opgaven findes ikke." };

  const startAendret = (task.startDate ?? null) !== start;
  const endAendret = (task.endDate ?? null) !== end;
  if (!startAendret && !endAendret) return { ok: true };

  await withDbRetry(
    () => prisma.task.update({ where: { id: taskId }, data: { startDate: start, endDate: end } }),
    "updateTaskDates",
  );

  const besked = endAendret
    ? end === null
      ? "fjernede deadline"
      : "satte deadline til " + dtoTekst(end)
    : start === null
      ? "fjernede startdato"
      : "ændrede startdato til " + dtoTekst(start);
  await prisma.activity.create({
    data: { taskId, actorId: me.id, text: me.navn + " " + besked, color: "#3355FF", displayTime: "lige nu" },
  });

  return { ok: true };
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
  return { id: task.id, start: task.startDate, slut: task.endDate };
}

/** Flueben på underopgave. */
export async function toggleSubtask(subtaskId: string) {
  await actor();
  const s = await prisma.subtask.findUnique({ where: { id: subtaskId } });
  if (!s) return;
  await prisma.subtask.update({ where: { id: subtaskId }, data: { done: !s.done } });
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

  const komm = await prisma.comment.create({
    data: {
      taskId,
      authorId: me.id,
      authorName: me.navn, // historisk navn — bevares hvis forfatteren senere slettes
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
  return { id: komm.id };
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
  return { kundeId: customerId, boardId: board.id };
}

/** Vælg/ændr en kundes farve. */
export async function setCustomerColor(customerId: string, farve: string) {
  await actor();
  if (!HEX.test(farve)) return;
  await prisma.customer.update({ where: { id: customerId }, data: { color: farve } });
}

/** Markér den aktuelle brugers notifikationer som læst. */
export async function markNotificationsRead() {
  const me = await actor();
  await prisma.notification.updateMany({ where: { userId: me.id, read: false }, data: { read: true } });
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
  return { ok: true };
}

/** Slet et board/projekt (med grupper, opgaver, kommentarer, notifikationer via cascade). */
export async function deleteBoard(boardId: string): Promise<SletResultat> {
  const me = await actor();
  const board = await prisma.board.findUnique({ where: { id: boardId }, select: { id: true, creatorId: true } });
  if (!board) return { ok: false, reason: "Boardet findes ikke." };
  if (!maaSlette(board.creatorId, me)) return { ok: false, reason: "Du har ikke rettigheder til at slette dette board." };
  await prisma.board.delete({ where: { id: boardId } });
  return { ok: true };
}

/** Slet en kunde (med boards, grupper, opgaver, kommentarer, notifikationer via cascade). */
export async function deleteCustomer(customerId: string): Promise<SletResultat> {
  const me = await actor();
  const kunde = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true, creatorId: true } });
  if (!kunde) return { ok: false, reason: "Kunden findes ikke." };
  if (!maaSlette(kunde.creatorId, me)) return { ok: false, reason: "Du har ikke rettigheder til at slette denne kunde." };
  await prisma.customer.delete({ where: { id: customerId } });
  return { ok: true };
}

// ================================================================
// FIL-UPLOAD (gemt direkte i Postgres)
// ================================================================

/** Upload én fil til en opgave. Bytes gemmes i Attachment.data. */
export async function uploadAttachment(formData: FormData): Promise<{ ok: boolean; error?: string; file?: FilDTO }> {
  const me = await actor();
  const taskId = String(formData.get("taskId") || "");
  const file = formData.get("file");
  if (!taskId || !(file instanceof File)) return { ok: false, error: "Der blev ikke sendt nogen fil." };
  if (file.size === 0) return { ok: false, error: "Filen er tom." };
  if (file.size > MAX_FIL_BYTES) return { ok: false, error: `Filen er for stor (maks ${readableSize(MAX_FIL_BYTES)} pr. fil).` };
  if (!filTilladt(file.name)) return { ok: false, error: "Filtypen er ikke tilladt." };

  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true } });
  if (!task) return { ok: false, error: "Opgaven findes ikke." };

  // Samlet grænse pr. opgave.
  const agg = await prisma.attachment.aggregate({ where: { taskId }, _sum: { size: true } });
  const brugt = agg._sum.size || 0;
  if (brugt + file.size > MAX_TASK_BYTES) {
    return { ok: false, error: `Opgaven har nået grænsen på ${readableSize(MAX_TASK_BYTES)} vedhæftede filer.` };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const type = filTypeLabel(file.name);
  const created = await prisma.attachment.create({
    data: {
      taskId,
      name: file.name,
      type,
      meta: readableSize(file.size),
      data: buf,
      size: file.size,
      mime: file.type || null,
      uploadedById: me.id,
      uploaderName: me.navn, // historisk navn — bevares hvis uploaderen senere slettes
    },
    select: { id: true, createdAt: true },
  });
  await prisma.activity.create({
    data: { taskId, actorId: me.id, text: me.navn + ' vedhæftede "' + file.name + '"', color: "#3355FF", displayTime: "lige nu" },
  });

  // Log samlet fil-forbrug (Neon-planen har kun 0,5 GB i alt).
  const total = await prisma.attachment.aggregate({ _sum: { size: true } });
  console.log(`[upload] ${file.name} (${readableSize(file.size)}) — samlet fil-forbrug nu ${readableSize(total._sum.size || 0)}`);

  const dato = `${created.createdAt.getDate()}. ${MDR[created.createdAt.getMonth()]}`;
  return {
    ok: true,
    file: {
      id: created.id,
      navn: file.name,
      type,
      meta: [me.navn, readableSize(file.size), dato].join(" · "),
      harData: true,
      uploaderId: me.id,
      bytes: file.size,
    },
  };
}

/** Slet en vedhæftet fil — kun uploader eller admin. */
export async function deleteAttachment(id: string): Promise<SletResultat> {
  const me = await actor();
  const att = await prisma.attachment.findUnique({
    where: { id },
    select: { id: true, name: true, taskId: true, uploadedById: true },
  });
  if (!att) return { ok: false, reason: "Filen findes ikke." };
  const maa = erAdmin(me.role) || (!!att.uploadedById && att.uploadedById === me.id);
  if (!maa) return { ok: false, reason: "Du har ikke rettigheder til at slette denne fil." };
  await prisma.attachment.delete({ where: { id } });
  await prisma.activity.create({
    data: { taskId: att.taskId, actorId: me.id, text: me.navn + ' slettede filen "' + att.name + '"', color: "#C4C7CE", displayTime: "lige nu" },
  });
  return { ok: true };
}

/** Slå e-mail-notifikationer til/fra for den aktuelle bruger. */
export async function setEmailNotifications(enabled: boolean) {
  const me = await actor();
  await prisma.user.update({ where: { id: me.id }, data: { emailNotifications: enabled } });
  revalidatePath("/indstillinger");
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

// ================================================================
// BRUGERADMINISTRATION (kun admin)
// ================================================================
const EMAIL_RE = /^[^@\s]+@thirdbase\.dk$/;

function buildWelcome(navn: string): { subject: string; html: string; text: string } {
  const link = appUrl();
  const fornavn = navn.split(" ")[0] || navn;
  const subject = "Du er oprettet i thirdbase Projektstyring";
  const html = `<!doctype html><html lang="da"><body style="margin:0;background:#F7F8F9;font-family:'Instrument Sans',system-ui,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#181818;">
    <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
        <span style="display:inline-block;width:12px;height:12px;background:#FF442B;transform:rotate(45deg);"></span>
        <span style="font-size:17px;font-weight:600;letter-spacing:-0.01em;">thirdbase</span>
        <span style="font-size:12px;color:#9E9E9E;">· Projektstyring</span>
      </div>
      <div style="background:#fff;border:1px solid #E6E8EC;padding:28px;">
        <div style="font-size:19px;font-weight:600;line-height:1.35;">Velkommen, ${fornavn}</div>
        <div style="margin-top:14px;font-size:14px;line-height:1.7;color:#4A4A4A;">
          Du er blevet oprettet i thirdbase Projektstyring — vores interne værktøj til boards,
          opgaver og deadlines for hver kunde.
        </div>
        <div style="margin-top:14px;font-size:14px;line-height:1.7;color:#4A4A4A;">
          Du logger ind med din <strong>@thirdbase.dk</strong> Google-konto — helt uden adgangskode.
          Klik blot på knappen herunder og vælg din thirdbase-konto.
        </div>
        <a href="${link}" style="display:inline-block;margin-top:22px;background:#FF442B;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 22px;">Åbn Projektstyring</a>
        <div style="margin-top:22px;font-size:13px;line-height:1.7;color:#6E6E6E;">
          Du får en e-mail, når du bliver tildelt en opgave eller nævnt i en kommentar.
          Det kan slås fra under <a href="${link}/indstillinger" style="color:#3355FF;">Indstillinger</a>.
        </div>
      </div>
    </div>
  </body></html>`;
  const text = [
    `Velkommen, ${fornavn}`,
    "",
    "Du er blevet oprettet i thirdbase Projektstyring.",
    "Du logger ind med din @thirdbase.dk Google-konto — helt uden adgangskode.",
    "",
    `Åbn Projektstyring: ${link}`,
    "",
    "Du får en e-mail, når du bliver tildelt en opgave eller nævnt i en kommentar.",
    `Det kan slås fra under Indstillinger: ${link}/indstillinger`,
  ].join("\n");
  return { subject, html, text };
}

export type BrugerResultat = {
  ok: boolean;
  error?: string;
  mailQueued?: boolean;
  mail?: { ok: boolean; transport: string; to?: string; error?: string };
};

/** Opret (eller genindbyd) en kollega som bruger — kun admin. Velkomstmail sendes out-of-band. */
export async function createUser(navn: string, email: string): Promise<BrugerResultat> {
  const me = await actor();
  if (!erAdmin(me.role)) return { ok: false, error: "Kun administratorer kan oprette brugere." };

  const rentNavn = navn.trim();
  const rentEmail = email.trim().toLowerCase();
  if (!rentNavn) return { ok: false, error: "Angiv et navn." };
  if (!rentEmail.endsWith("@thirdbase.dk")) return { ok: false, error: "E-mailen skal slutte på @thirdbase.dk." };
  if (!EMAIL_RE.test(rentEmail)) return { ok: false, error: "Ugyldig @thirdbase.dk-e-mailadresse." };

  const eksisterende = await prisma.user.findUnique({ where: { email: rentEmail }, select: { invitedAt: true } });
  await prisma.user.upsert({
    where: { email: rentEmail },
    // Opdatér navn; sæt invitedAt hvis brugeren ikke allerede er inviteret (undgå at nulstille).
    update: { name: rentNavn, ...(eksisterende?.invitedAt ? {} : { invitedAt: new Date() }) },
    create: {
      email: rentEmail,
      name: rentNavn,
      initials: initialerAf(rentNavn),
      color: farveForNavn(rentEmail),
      role: "Medarbejder",
      emailNotifications: true,
      invitedAt: new Date(),
    },
  });

  // Send velkomstmailen OUT-OF-BAND, så createUser returnerer med det samme.
  // after() kører efter responsen (via waitUntil på Vercel). Fejl fanges og logges —
  // en mailfejl må aldrig vælte requesten. Konkrete SMTP-fejl kan ses via 'Send igen'.
  const { subject, html, text } = buildWelcome(rentNavn);
  after(async () => {
    const mail = await sendEmailDetailed({ to: rentEmail, subject, html, text });
    if (!mail.ok) console.error(`[createUser] velkomstmail til ${rentEmail} fejlede:`, mail.error);
  });

  revalidatePath("/brugere");
  return { ok: true, mailQueued: true, mail: { ok: true, transport: activeTransport(), to: rentEmail } };
}

/** Send velkomst-/invitationsmailen igen — kun admin. */
export async function resendInvite(userId: string): Promise<BrugerResultat> {
  const me = await actor();
  if (!erAdmin(me.role)) return { ok: false, error: "Kun administratorer kan sende invitationer." };
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
  if (!u) return { ok: false, error: "Brugeren findes ikke." };
  const { subject, html, text } = buildWelcome(u.name);
  const mail = await sendEmailDetailed({ to: u.email, subject, html, text });
  return { ok: true, mail: { ok: mail.ok, transport: mail.transport, to: u.email, error: mail.error } };
}

/**
 * Fjern en bruger — kun admin, og aldrig én selv.
 * Opgaverne BLIVER: brugeren afassignes bare. Kommentarer, filer og aktivitetslog
 * bevares — navnet denormaliseres til historisk tekst FØR sletningen, så SetNull-
 * relationerne ikke efterlader en tom forfatter/uploader. Ingen e-mail, ingen
 * revalidatePath('/') (perf). Kun /brugere revalideres.
 */
export async function deleteUser(userId: string): Promise<SletResultat> {
  const me = await actor();
  if (!erAdmin(me.role)) return { ok: false, reason: "Kun administratorer kan fjerne brugere." };
  if (userId === me.id) return { ok: false, reason: "Du kan ikke fjerne dig selv." };

  const bruger = await withDbRetry(
    () => prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true } }),
    "deleteUser:read",
  );
  if (!bruger) return { ok: false, reason: "Brugeren findes ikke." };

  await withDbRetry(
    () =>
      prisma.$transaction([
        // Bevar navnet som historisk tekst (kun hvor det ikke allerede er sat).
        prisma.comment.updateMany({ where: { authorId: userId, authorName: null }, data: { authorName: bruger.name } }),
        prisma.attachment.updateMany({ where: { uploadedById: userId, uploaderName: null }, data: { uploaderName: bruger.name } }),
        // Afassign fra alle opgaver — opgaverne selv røres ikke.
        prisma.user.update({ where: { id: userId }, data: { assignedTasks: { set: [] } } }),
        // Slet brugeren. Comment.author/Attachment.uploader/Activity.actor/Task.creator
        // er alle SetNull, så intet indhold slettes med.
        prisma.user.delete({ where: { id: userId } }),
      ]),
    "deleteUser",
  );

  revalidatePath("/brugere");
  return { ok: true };
}

/** Tildel en bruger som ansvarlig på en opgave (notifikation + mail). */
export async function assignUser(taskId: string, userId: string) {
  const me = await actor();
  const ctx = await taskKontekst(taskId);
  if (!ctx) return;
  if (ctx.assignees.some((a) => a.id === userId)) return; // allerede ansvarlig
  await prisma.task.update({ where: { id: taskId }, data: { assignees: { connect: { id: userId } } } });
  const bruger = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await prisma.activity.create({
    data: { taskId, actorId: me.id, text: me.navn + " tildelte " + (bruger?.name || "en bruger"), color: "#3355FF", displayTime: "lige nu" },
  });
  await createNotification({
    recipientId: userId,
    actor: me,
    text: me.navn + ' tildelte dig "' + ctx.name + '"',
    color: "#3355FF",
    taskId,
    taskName: ctx.name,
    customerName: ctx.group?.board?.customer?.name ?? null,
  });
}

/** Fjern en bruger som ansvarlig på en opgave. */
export async function unassignUser(taskId: string, userId: string) {
  const me = await actor();
  const t = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true } });
  if (!t) return;
  await prisma.task.update({ where: { id: taskId }, data: { assignees: { disconnect: { id: userId } } } });
  const bruger = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await prisma.activity.create({
    data: { taskId, actorId: me.id, text: me.navn + " fjernede " + (bruger?.name || "en bruger") + " som ansvarlig", color: "#C4C7CE", displayTime: "lige nu" },
  });
}
