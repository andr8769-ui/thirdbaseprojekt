import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/db";
import { erAdmin } from "@/lib/constants";
import { loadKundeprojekter } from "@/lib/kundeprojekt-data";
import KundeprojektListe from "@/components/KundeprojektListe";

export const dynamic = "force-dynamic";

/** Oversigt over kundeprojekter. Alle logget-ind brugere har adgang;
 *  kun admin ser knapperne til at oprette og slette. */
export default async function KundeprojekterPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const me = await withDbRetry(
    () => prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } }),
    "kundeprojekter:me",
  );

  const projekter = await loadKundeprojekter();
  return <KundeprojektListe projekter={projekter} erAdministrator={erAdmin(me?.role)} />;
}
