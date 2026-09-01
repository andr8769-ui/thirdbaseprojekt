import type { KundeDTO, DashboardKortDTO } from "@/lib/types";

// Ren aggregering (ingen Prisma) — bruges både server-side i loadAppData og
// klient-side, så forsidens kort kan genberegnes optimistisk når fx en deadline
// ændres. Beregnes fra det allerede-indlæste datatræ, nul ekstra DB-kald.
// idag sendes ind (i stedet for at blive beregnet her), så server og klient
// altid regner overskredne deadlines ud fra præcis samme dato.
export function beregnDashboard(kunder: KundeDTO[], idag: string): DashboardKortDTO[] {
  return kunder.map((k) => {
    let opgaver = 0;
    let faerdige = 0;
    let overskredne = 0;
    const aabne: { id: string; navn: string; slut: string | null; boardId: string }[] = [];
    for (const b of k.boards) {
      for (const g of b.grupper) {
        for (const o of g.opgaver) {
          opgaver++;
          if (o.status === "Færdig") {
            faerdige++;
          } else {
            if (o.slut && o.slut < idag) overskredne++;
            aabne.push({ id: o.id, navn: o.navn, slut: o.slut, boardId: b.id });
          }
        }
      }
    }
    aabne.sort((a, b) => ((a.slut || "￿") < (b.slut || "￿") ? -1 : (a.slut || "￿") > (b.slut || "￿") ? 1 : 0));
    return {
      id: k.id,
      navn: k.navn,
      kort: k.kort,
      farve: k.farve,
      boards: k.boards.length,
      opgaver,
      faerdige,
      procent: opgaver > 0 ? Math.round((faerdige / opgaver) * 100) : 0,
      overskredne,
      foersteBoardId: k.boards[0]?.id ?? null,
      naeste: aabne.slice(0, 3),
    };
  });
}
