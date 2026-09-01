import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// ------------------------------------------------------------------
// "Forbliv logget ind"
// Auth.js' default-session er 30 dage. Skal fluebenet betyde noget, skal
// baseline derfor SÆTTES NED: uden flueben 1 dag, med flueben 30 dage.
//
// Auth.js kan ikke variere session.maxAge pr. login (den er statisk config),
// så sessionens levetid styres i stedet af et absolut udløb i selve tokenet
// (token.udloeb). Cookiens maxAge er loftet på 30 dage; er tokenet logisk
// udløbet, returnerer jwt-callbacken null, og Auth.js rydder selv
// sessionscookien (sessionStore.clean()).
// ------------------------------------------------------------------
const DAG_MS = 24 * 60 * 60 * 1000;
/** Uden flueben: sessionen udløber 1 dag efter login. */
export const SESSION_KORT_MS = 1 * DAG_MS;
/** Med flueben: sessionen udløber 30 dage efter login. */
export const SESSION_LANG_MS = 30 * DAG_MS;
/** Kortlivet cookie der bærer fluebenet fra /login gennem OAuth-redirectet. */
export const HUSK_COOKIE = "tb-husk";
/** Secure-cookies (og __Secure--præfiks) i produktion — som Auth.js' egen default. */
export const SIKRE_COOKIES = process.env.NODE_ENV === "production";

/** Er tokenet ældre end sit absolutte udløb? Ren funktion — også edge-sikker. */
export function erUdloebet(token: Record<string, unknown>): boolean {
  const udloeb = token.udloeb;
  return typeof udloeb === "number" && Date.now() > udloeb;
}

// Edge-sikker konfiguration (ingen Prisma) — bruges af middleware.
// hd=thirdbase.dk beder Google om kun at tilbyde thirdbase-konti; den rigtige
// håndhævelse sker server-side i signIn-callbacket (se auth.ts).
export const authConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          hd: "thirdbase.dk",
          prompt: "select_account",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  // Loft for cookiens levetid. Den reelle sessionslængde styres af token.udloeb.
  session: { strategy: "jwt", maxAge: SESSION_LANG_MS / 1000 },
  // Eksplicitte cookie-flag (matcher Auth.js' egne defaults 1:1, så eksisterende
  // sessioner ikke invalideres): httpOnly + sameSite + secure i produktion.
  cookies: {
    sessionToken: {
      name: `${SIKRE_COOKIES ? "__Secure-" : ""}authjs.session-token`,
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: SIKRE_COOKIES },
    },
  },
  callbacks: {
    // Beskytter alle sider: kun loggede-ind brugere slipper igennem.
    authorized({ auth, request }) {
      const loggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      if (pathname === "/login") return true;
      return loggedIn;
    },
    // Håndhæver det absolutte udløb. Ligger her (og ikke kun i auth.ts), så
    // middleware — som kun kender denne Prisma-fri config — også afviser en
    // udløbet session. Ren og edge-sikker: rører hverken database eller cookies.
    jwt({ token }) {
      if (erUdloebet(token)) return null;
      return token;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;

export default authConfig;
