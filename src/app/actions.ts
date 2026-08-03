"use server";

import { revalidatePath } from "next/cache";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { statusOf, prioOf, IDAG } from "@/lib/constants";

/** Log ud. */
export async function logout() {
  await signOut({ redirectTo: "/login" });
}

async function actor() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke logget ind");
  return { id: session.user.id, navn: session.user.name || "En bruger" };
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

/** Ét-klik statusskifte (tabel, kanban-drop, panel). */
export async function setStatus(taskId: string, status: string) {
  const me = await actor();
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true } });
  if (!task) return;
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

/** Skriv kommentar (med @mentions → notifikationer). */
export async function addComment(taskId: string, body: string) {
  const me = await actor();
  const tekst = body.trim();
  if (!tekst) return;

  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true, name: true } });
  if (!task) return;

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

  // Notifikér nævnte kolleger (ikke én selv).
  for (const u of naevnte) {
    if (u.id === me.id) continue;
    await prisma.notification.create({
      data: {
        userId: u.id,
        text: me.navn + ' nævnte dig i "' + task.name + '"',
        time: "for et øjeblik siden",
        color: "#FF442B",
      },
    });
  }
  revalidatePath("/");
}

/** Opret ny kunde med standard-board og tre grupper. */
export async function createCustomer(navn: string) {
  await actor();
  const rent = navn.trim();
  if (!rent) return null;
  const antal = await prisma.customer.count();
  const customer = await prisma.customer.create({
    data: {
      name: rent,
      short: rent.slice(0, 2).toUpperCase(),
      industry: "Ny kunde",
      position: antal,
      boards: {
        create: {
          name: "Onboarding",
          position: 0,
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
  await actor();
  const rent = navn.trim();
  if (!rent) return null;
  const antal = await prisma.board.count({ where: { customerId } });
  const board = await prisma.board.create({
    data: {
      name: rent,
      position: antal,
      customerId,
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

/** Markér den aktuelle brugers notifikationer som læst. */
export async function markNotificationsRead() {
  const me = await actor();
  await prisma.notification.updateMany({ where: { userId: me.id, read: false }, data: { read: true } });
  revalidatePath("/");
}
