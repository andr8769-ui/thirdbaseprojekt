import { PrismaClient } from "@prisma/client";

// Byg datasource-URL'en i runtime ud fra DATABASE_URL og tilføj connect_timeout
// og pool_timeout (15s) hvis de ikke allerede findes — så Neon Free (scale-to-zero)
// har tid til at vågne ved cold start. Eksisterende params (pgbouncer, sslmode m.fl.)
// bevares. Vi ændrer IKKE env-vars i Vercel; det løses her i koden.
function datasourceUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    if (!u.searchParams.has("connect_timeout")) u.searchParams.set("connect_timeout", "15");
    if (!u.searchParams.has("pool_timeout")) u.searchParams.set("pool_timeout", "15");
    return u.toString();
  } catch {
    // Kunne URL'en ikke parses, så brug den uændret (Prisma validerer selv).
    return raw;
  }
}

// Genbrug én PrismaClient på tværs af hot-reloads i udvikling og
// på tværs af serverless-invocations på Vercel.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: datasourceUrl(),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
