// ------------------------------------------------------------------
// withDbRetry — genforsøger DB-kald der fejler pga. Neon Free scale-to-zero
// cold start (computen suspenderes efter inaktivitet og skal vågne).
//
// Retryer på: PrismaClientInitializationError, fejlkode P1001, og beskeder der
// matcher can't reach database server / connection closed / connection reset /
// ECONNRESET / ETIMEDOUT. Op til 4 genforsøg med backoff 300/800/2000/4000 ms.
// Én log-linje pr. retry. Andre fejl kastes videre med det samme.
// ------------------------------------------------------------------

const BACKOFFS = [300, 800, 2000, 4000]; // ms før hvert genforsøg

const RETRY_MATCHES = [
  "can't reach database server",
  "cannot reach database server",
  "connection closed",
  "connection reset",
  "econnreset",
  "etimedout",
  "econnrefused",
];

function isRetryable(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { name?: string; code?: string; message?: string };
  if (e.name === "PrismaClientInitializationError") return true;
  if (e.code === "P1001") return true;
  const msg = (e.message || "").toLowerCase();
  return RETRY_MATCHES.some((m) => msg.includes(m));
}

function kortFejl(err: unknown): string {
  const e = err as { code?: string; message?: string };
  const m = (e?.message || String(err)).split("\n")[0].slice(0, 140);
  return e?.code ? `${e.code}: ${m}` : m;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function withDbRetry<T>(fn: () => Promise<T>, label = "db"): Promise<T> {
  let lastErr: unknown;
  // 1 initialt forsøg + op til BACKOFFS.length genforsøg.
  for (let attempt = 0; attempt <= BACKOFFS.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || attempt === BACKOFFS.length) throw err;
      const delay = BACKOFFS[attempt];
      console.warn(`[withDbRetry:${label}] genforsøg ${attempt + 1}/${BACKOFFS.length} om ${delay}ms — ${kortFejl(err)}`);
      await sleep(delay);
    }
  }
  throw lastErr;
}
