import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/db";
import { erAdmin } from "@/lib/constants";
import { loadKundeprojekt } from "@/lib/kundeprojekt-data";
import KundeprojektDetalje from "@/components/KundeprojektDetalje";

export const dynamic = "force-dynamic";

/** Detaljeside for ét kundeprojekt. Alle logget-ind brugere må se og
 *  opdatere status, tjeklister og KPI-værdier. Kun admin må ændre hvilken
 *  kunde projektet hører til. */
export default async function KundeprojektPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const projekt = await loadKundeprojekt(id);
  if (!projekt) notFound();

  const [me, kunder] = await withDbRetry(
    () =>
      Promise.all([
        prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } }),
        prisma.customer.findMany({ orderBy: { position: "asc" }, select: { id: true, name: true } }),
      ]),
    "kundeprojekt:detalje:kunder",
  );

  return (
    <KundeprojektDetalje
      projekt={projekt}
      kunder={kunder.map((k) => ({ id: k.id, navn: k.name }))}
      erAdministrator={erAdmin(me?.role)}
    />
  );
}
