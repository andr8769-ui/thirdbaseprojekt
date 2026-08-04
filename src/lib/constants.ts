// ------------------------------------------------------------------
// Delte konstanter og hjælpere — porteret 1:1 fra prototypen.
// Ingen React-afhængigheder, så både server og klient kan bruge dem.
// ------------------------------------------------------------------

export type StatusDef = { navn: string; f: string; t: string };
export type PrioDef = { navn: string; f: string };

export const STATUS: StatusDef[] = [
  { navn: "Ikke startet", f: "#C4C7CE", t: "#181818" },
  { navn: "I gang", f: "#3355FF", t: "#FFFFFF" },
  { navn: "Afventer kunde", f: "#FFB020", t: "#181818" },
  { navn: "Klar til review", f: "#7B61FF", t: "#FFFFFF" },
  { navn: "Færdig", f: "#16A34A", t: "#FFFFFF" },
];

export const PRIO: PrioDef[] = [
  { navn: "Kritisk", f: "#FF442B" },
  { navn: "Høj", f: "#FF8A65" },
  { navn: "Medium", f: "#3355FF" },
  { navn: "Lav", f: "#9E9E9E" },
];

// Prototypen regner ud fra en fast "i dag" (2026-08-03). Vi beholder den,
// så deadlines, tidslinjer og buckets matcher seed-dataens datoer 1:1.
export const IDAG = "2026-08-03";

export const MDR = [
  "jan.", "feb.", "mar.", "apr.", "maj", "jun.",
  "jul.", "aug.", "sep.", "okt.", "nov.", "dec.",
];

// Farvepalet til nye brugere (auto-oprettet ved første login).
export const BRUGER_FARVER = ["#FF442B", "#3355FF", "#181818", "#FF8A65", "#7B61FF", "#16A34A"];

// Farvepalet til nye kunder (styrer dashboard-kortets accent).
export const KUNDE_FARVER = ["#FF442B", "#3355FF", "#7B61FF", "#16A34A", "#FF8A65", "#242424"];

// Admin må slette alt. Ellers gælder ejer/creator-reglen.
export function erAdmin(rolle?: string | null): boolean {
  return (rolle || "").trim().toLowerCase() === "admin";
}

// ---- Fil-upload (gemt i Postgres) ----
export const MAX_FIL_BYTES = 4 * 1024 * 1024; // 4 MB pr. fil
export const MAX_TASK_BYTES = 25 * 1024 * 1024; // 25 MB samlet pr. opgave

// Tilladte filtyper (endelser). Alt andet afvises server-side.
export const TILLADTE_EXT = new Set([
  "pdf",
  "png", "jpg", "jpeg", "gif", "webp", "svg",
  "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "csv", "txt", "zip",
]);

export function filEndelse(navn: string): string {
  const dele = navn.split(".");
  return dele.length > 1 ? dele.pop()!.toLowerCase() : "";
}

export function filTilladt(navn: string): boolean {
  return TILLADTE_EXT.has(filEndelse(navn));
}

export function filTypeLabel(navn: string): string {
  const e = filEndelse(navn);
  return e ? e.toUpperCase().slice(0, 4) : "FIL";
}

export function readableSize(bytes: number): string {
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1).replace(".", ",") + " MB";
  if (bytes >= 1024) return Math.round(bytes / 1024) + " KB";
  return bytes + " B";
}

export function statusOf(navn: string): StatusDef {
  return STATUS.find((s) => s.navn === navn) || STATUS[0];
}

export function prioOf(navn: string): PrioDef {
  return PRIO.find((p) => p.navn === navn) || PRIO[2];
}

// Avatar-stil (kvadratisk initial-badge)
export function AV(farve: string, px: number, extra?: string): string {
  return (
    "width:" + px + "px; height:" + px + "px; display:flex; align-items:center; justify-content:center; " +
    "font-weight:600; color:#fff; flex:none; font-size:" + Math.round(px * 0.38) + "px; background:" + farve + ";" +
    (extra || "")
  );
}

// Farvet prik/segment
export function PRIK(farve: string, px: number, extra?: string): string {
  return "width:" + px + "px; height:" + px + "px; flex:none; background:" + farve + ";" + (extra || "");
}

export function dtoTekst(d?: string | null): string {
  if (!d) return "—";
  const p = d.split("-");
  return parseInt(p[2], 10) + ". " + MDR[parseInt(p[1], 10) - 1];
}

export function dage(d: string): number {
  return Math.round((new Date(d).getTime() - new Date(IDAG).getTime()) / 86400000);
}

export function deadlineFarve(status: string, slut?: string | null): string {
  if (status === "Færdig") return "#9E9E9E";
  if (!slut) return "#4A4A4A";
  const d = dage(slut);
  if (d < 0) return "#FF442B";
  if (d <= 1) return "#FF8A65";
  return "#4A4A4A";
}

// Initialer af et navn: første bogstav i de(t) to første ord.
export function initialerAf(navn: string): string {
  const dele = navn.trim().split(/\s+/).filter(Boolean);
  if (dele.length === 0) return "?";
  if (dele.length === 1) return dele[0].slice(0, 2).toUpperCase();
  return (dele[0][0] + dele[dele.length - 1][0]).toUpperCase();
}

// Deterministisk farve ud fra en streng (til nye brugere).
export function farveForNavn(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return BRUGER_FARVER[h % BRUGER_FARVER.length];
}

// Konvertér en CSS-deklarationsstreng ("a:b; c:d") til et React style-objekt,
// så prototypens style-strenge kan genbruges næsten ordret.
export function sx(css: string): React.CSSProperties {
  const out: Record<string, string> = {};
  css.split(";").forEach((decl) => {
    const i = decl.indexOf(":");
    if (i < 0) return;
    const rawProp = decl.slice(0, i).trim();
    const val = decl.slice(i + 1).trim();
    if (!rawProp || !val) return;
    const prop = rawProp.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[prop] = val;
  });
  return out as React.CSSProperties;
}
