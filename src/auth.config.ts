import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

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
  callbacks: {
    // Beskytter alle sider: kun loggede-ind brugere slipper igennem.
    authorized({ auth, request }) {
      const loggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      if (pathname === "/login") return true;
      return loggedIn;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;

export default authConfig;
