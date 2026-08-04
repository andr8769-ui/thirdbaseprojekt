// ------------------------------------------------------------------
// Kanonisk offentlig URL for appen. Bruges KUN server-side til at bygge
// absolutte links i e-mails og notifikationer.
//
// Bevidst afkoblet fra AUTH_URL: AUTH_URL/NEXTAUTH_URL styrer NextAuths
// request-host (og bør være UNSET i produktion, så auth er host-agnostisk via
// trustHost — ellers omskriver middleware enhver request-origin til den ene host
// og redirecter væk fra projektstyring.thirdbase.dk). Link-basen skal derimod
// altid pege på den kanoniske host, uanset hvilken host requesten kom ind på.
//
// Rækkefølge: APP_URL (eksplicit override) → localhost i udvikling → ellers den
// kanoniske produktionshost. Ingen env-variabel er nødvendig i produktion.
export const APP_URL = (
  process.env.APP_URL ||
  (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : "https://projektstyring.thirdbase.dk")
).replace(/\/$/, "");

export function appUrl(): string {
  return APP_URL;
}
