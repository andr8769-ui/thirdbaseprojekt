// ------------------------------------------------------------------
// Kører ved hvert build (kaldes fra "build"-scriptet):
//   1) prisma migrate deploy  — anvender migrationer mod den direkte forbindelse
//   2) seed — KUN hvis databasen er tom, så prototypens demodata kommer ind én gang
//
// Guard: hvis DATABASE_URL mangler (fx lokalt build uden database), springes
// migrate + seed helt over, så buildet stadig lykkes.
// ------------------------------------------------------------------
import { execSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.log("[deploy] DATABASE_URL mangler — springer migrate + seed over (build fortsætter).");
  process.exit(0);
}

try {
  console.log("[deploy] Kører prisma migrate deploy …");
  execSync("npx prisma migrate deploy", { stdio: "inherit" });

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const antal = await prisma.customer.count();
    if (antal > 0) {
      console.log(`[deploy] Databasen har allerede ${antal} kunder — springer seed over.`);
    } else {
      console.log("[deploy] Tom database — kører seed …");
      execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
    }
  } finally {
    await prisma.$disconnect();
  }
} catch (err) {
  console.error("[deploy] Fejl under migrate/seed:", err?.message || err);
  process.exit(1);
}
