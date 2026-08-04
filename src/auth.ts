import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/db";
import { initialerAf, farveForNavn } from "@/lib/constants";

// Mails der automatisk får rollen Admin (komma-separeret env, default andreas).
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "andreas@thirdbase.dk")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

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
      const erAdmin = adminEmails().includes(email);

      const nu = new Date();
      // Kobl på den eksisterende brugerrække via email (ingen dubletter) og
      // opdatér navn/avatar fra Google. lastLoginAt driver Aktiv/Inviteret-status.
      await withDbRetry(() => prisma.user.upsert({
        where: { email },
        update: {
          name: navn,
          image: billede ?? undefined,
          lastLoginAt: nu,
          // Promovér admin-mails; nedgrader aldrig andre roller.
          ...(erAdmin ? { role: "Admin" } : {}),
        },
        create: {
          email,
          name: navn,
          image: billede,
          initials: initialerAf(navn),
          color: farveForNavn(email),
          role: erAdmin ? "Admin" : "Medarbejder",
          lastLoginAt: nu,
        },
      }), "signIn");

      return true;
    },

    async jwt({ token, user }) {
      const email = (user?.email ?? token.email ?? "").toString().toLowerCase();
      if (user && email) {
        const dbUser = await withDbRetry(() => prisma.user.findUnique({ where: { email } }), "jwt");
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
