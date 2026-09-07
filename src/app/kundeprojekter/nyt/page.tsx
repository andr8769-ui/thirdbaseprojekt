import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/db";
import { erAdmin } from "@/lib/constants";
import KundeprojektForm from "@/components/KundeprojektForm";

export const dynamic = "force-dynamic";

/** Opret kundeprojekt ud fra skabelonen. Kun admin.
 *  Kaldes med ?kunde=<id> fra en kundes sidebar, og kunden er da forudvalgt
 *  og låst, så projektet oprettes koblet til netop den kunde. */
export default async function NytKundeprojektPage({
  searchParams,
}: {
  searchParams: Promise<{ kunde?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const me = await withDbRetry(
    () => prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } }),
    "kundeprojekt:nyt:me",
  );
  if (!erAdmin(me?.role)) redirect("/kundeprojekter");

  const [brugere, kunder] = await withDbRetry(
    () =>
      Promise.all([
        prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
        prisma.customer.findMany({ orderBy: { position: "asc" }, select: { id: true, name: true } }),
      ]),
    "kundeprojekt:nyt:data",
  );

  // Kunden fra sidebaren slås op i den allerede hentede liste, så en ukendt
  // eller manipuleret id ikke låser formularen til noget der ikke findes.
  const { kunde } = await searchParams;
  const valgt = kunde ? kunder.find((k) => k.id === kunde) : undefined;

  return (
    <KundeprojektForm
      brugere={brugere.map((b) => ({ id: b.id, navn: b.name }))}
      kunder={kunder.map((k) => ({ id: k.id, navn: k.name }))}
      laastKunde={valgt ? { id: valgt.id, navn: valgt.name } : null}
    />
  );
}
