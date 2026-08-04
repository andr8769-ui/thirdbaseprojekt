import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { erAdmin, MDR } from "@/lib/constants";
import UsersAdmin from "@/components/UsersAdmin";

export const dynamic = "force-dynamic";

function fmt(d: Date | null): string {
  if (!d) return "—";
  return `${d.getDate()}. ${MDR[d.getMonth()]} ${d.getFullYear()}`;
}

export default async function BrugerePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (!erAdmin(me?.role)) redirect("/");

  const brugere = await prisma.user.findMany({
    orderBy: [{ createdAt: "asc" }],
    select: { id: true, name: true, email: true, role: true, invitedAt: true, lastLoginAt: true, createdAt: true },
  });

  const rows = brugere.map((u) => ({
    id: u.id,
    navn: u.name,
    email: u.email,
    rolle: u.role,
    status: u.lastLoginAt ? ("Aktiv" as const) : ("Inviteret" as const),
    tidspunkt: fmt(u.invitedAt ?? u.createdAt),
    sidsteLogin: u.lastLoginAt ? fmt(u.lastLoginAt) : null,
  }));

  return <UsersAdmin brugere={rows} />;
}
