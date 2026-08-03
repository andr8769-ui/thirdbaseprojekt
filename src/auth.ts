import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { prisma } from "@/lib/prisma";
import { initialerAf, farveForNavn } from "@/lib/constants";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,

    // KUN verificerede @thirdbase.dk-mails må logge ind. Alt andet afvises,
    // og NextAuth sender brugeren til /login?error=AccessDenied (pæn fejlside).
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return false;

      const email = (profile?.email ?? "").toLowerCase();
      const emailVerified = (profile as { email_verified?: boolean } | undefined)?.email_verified === true;

      if (!emailVerified) return false;
      if (!email.endsWith("@thirdbase.dk")) return false;

      // Første gang en thirdbase-bruger logger ind, oprettes den automatisk.
      const navn = (profile?.name && String(profile.name).trim()) || email.split("@")[0];
      const billede = (profile as { picture?: string } | undefined)?.picture ?? null;

      await prisma.user.upsert({
        where: { email },
        update: { name: navn, image: billede ?? undefined },
        create: {
          email,
          name: navn,
          image: billede,
          initials: initialerAf(navn),
          color: farveForNavn(email),
          role: "Medarbejder",
        },
      });

      return true;
    },

    async jwt({ token, user }) {
      const email = (user?.email ?? token.email ?? "").toString().toLowerCase();
      if (user && email) {
        const dbUser = await prisma.user.findUnique({ where: { email } });
        if (dbUser) {
          token.uid = dbUser.id;
          token.role = dbUser.role;
          token.initials = dbUser.initials;
          token.color = dbUser.color;
          token.name = dbUser.name;
          token.picture = dbUser.image;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? session.user.id;
        session.user.role = (token.role as string) ?? "Medarbejder";
        session.user.initials = (token.initials as string) ?? "";
        session.user.color = (token.color as string) ?? "#3355FF";
      }
      return session;
    },
  },
});
