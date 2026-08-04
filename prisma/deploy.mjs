// ------------------------------------------------------------------
// Kører ved hvert build (kaldes fra "build"-scriptet):
//   1) prisma migrate deploy  — anvender migrationer mod den direkte forbindelse
//   2) seed — KUN hvis databasen er tom (prototypens demodata én gang)
//   3) backfills (idempotente, kører hver gang):
//        a) distinkte kundefarver, så ingen to kunder er ens
//        b) admin-rolle til ADMIN_EMAILS
//
// Guard: hvis DATABASE_URL mangler (fx lokalt build uden database), springes
// alt DB-arbejde over, så buildet stadig lykkes.
// ------------------------------------------------------------------
import { execSync } from "node:child_process";

// Skal matche KUNDE_FARVER i src/lib/constants.ts.
const PALETTE = ["#FF442B", "#3355FF", "#7B61FF", "#16A34A", "#FF8A65", "#242424"];
const HEX = /^#[0-9A-Fa-f]{6}$/;

if (!process.env.DATABASE_URL) {
  console.log("[deploy] DATABASE_URL mangler — springer migrate + seed + backfill over (build fortsætter).");
  process.exit(0);
}

try {
  console.log("[deploy] Kører prisma migrate deploy …");
  execSync("npx prisma migrate deploy", { stdio: "inherit" });

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    // --- seed kun hvis tom ---
    const antal = await prisma.customer.count();
    if (antal > 0) {
      console.log(`[deploy] Databasen har allerede ${antal} kunder — springer seed over.`);
    } else {
      console.log("[deploy] Tom database — kører seed …");
      execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
    }

    await backfillFarver(prisma);
    await backfillAdmin(prisma);
  } finally {
    await prisma.$disconnect();
  }
} catch (err) {
  console.error("[deploy] Fejl under migrate/seed/backfill:", err?.message || err);
  process.exit(1);
}

// Sørg for at ingen to kunder deler farve. Deterministisk efter createdAt→navn→id:
// første kunde med en given farve beholder den (også en bevidst valgt farve), og
// efterfølgende dubletter (samt tomme/ugyldige) får næste ledige palettefarve.
// Idempotent: når alle farver allerede er distinkte, ændres intet.
async function backfillFarver(prisma) {
  const kunder = await prisma.customer.findMany({
    orderBy: [{ createdAt: "asc" }, { name: "asc" }, { id: "asc" }],
    select: { id: true, color: true },
  });

  const brugt = new Set();
  let overflow = 0;
  const updates = [];
  for (const k of kunder) {
    if (k.color && HEX.test(k.color) && !brugt.has(k.color)) {
      brugt.add(k.color); // unik farve → behold
      continue;
    }
    // dublet eller ugyldig farve → tildel næste ledige palettefarve
    let valgt = PALETTE.find((c) => !brugt.has(c));
    if (!valgt) valgt = PALETTE[overflow++ % PALETTE.length]; // flere kunder end farver → cyklér
    brugt.add(valgt);
    updates.push(prisma.customer.update({ where: { id: k.id }, data: { color: valgt } }));
  }

  if (updates.length) {
    await prisma.$transaction(updates);
    console.log(`[deploy] farve-backfill: ${updates.length} kunde(r) fik en distinkt farve.`);
  } else {
    console.log("[deploy] farve-backfill: alle kundefarver er allerede distinkte.");
  }
}

// Sæt role=Admin på ADMIN_EMAILS (default andreas@thirdbase.dk).
async function backfillAdmin(prisma) {
  const emails = (process.env.ADMIN_EMAILS || "andreas@thirdbase.dk")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!emails.length) return;
  const res = await prisma.user.updateMany({
    where: { email: { in: emails }, role: { not: "Admin" } },
    data: { role: "Admin" },
  });
  console.log(`[deploy] admin-backfill: ${res.count} bruger(e) sat til Admin.`);
}
