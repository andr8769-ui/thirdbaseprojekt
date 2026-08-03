import NextAuth from "next-auth";
import authConfig from "./auth.config";

// Alle sider bag login. Middleware kører på edge og bruger kun den
// Prisma-fri authConfig (JWT-session verificeres uden database-opslag).
export default NextAuth(authConfig).auth;

export const config = {
  // Undtag Next-interne stier og /api (så /api/auth/* virker).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)"],
};
