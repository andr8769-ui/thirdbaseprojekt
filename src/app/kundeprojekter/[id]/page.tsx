import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { loadKundeprojekt } from "@/lib/kundeprojekt-data";
import KundeprojektDetalje from "@/components/KundeprojektDetalje";

export const dynamic = "force-dynamic";

/** Detaljeside for ét kundeprojekt. Alle logget-ind brugere må se og
 *  opdatere status, tjeklister og KPI-værdier. */
export default async function KundeprojektPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const projekt = await loadKundeprojekt(id);
  if (!projekt) notFound();

  return <KundeprojektDetalje projekt={projekt} />;
}
