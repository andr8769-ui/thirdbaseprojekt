import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/db";
import { baseEtiket } from "@/lib/thirdbase-template";
import type {
  KundeprojektDTO,
  KundeprojektKortDTO,
  KpiOverblikDTO,
  BaseDTO,
} from "@/lib/kundeprojekt-types";

const t = (v: string | null | undefined) => v ?? "";

/** Oversigt over alle kundeprojekter med fremdrift på tjeklisterne. */
export async function loadKundeprojekter(): Promise<KundeprojektKortDTO[]> {
  const raekker = await withDbRetry(
    () =>
      prisma.clientProject.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          kundeNavn: true,
          nuvaerendeBase: true,
          samletStatus: true,
          projektstart: true,
          forventetAfslutning: true,
          projektansvarlig: { select: { name: true } },
          customer: { select: { id: true, name: true } },
          baser: { select: { tjekliste: { select: { afkrydset: true } } } },
        },
      }),
    "kundeprojekter:liste",
  );

  return raekker.map((p) => {
    const punkter = p.baser.flatMap((b) => b.tjekliste);
    return {
      id: p.id,
      kundeNavn: p.kundeNavn,
      tilknyttetKundeId: p.customer?.id ?? null,
      tilknyttetKundeNavn: p.customer?.name ?? null,
      nuvaerendeBase: p.nuvaerendeBase,
      samletStatus: p.samletStatus,
      projektansvarligNavn: p.projektansvarlig?.name ?? null,
      projektstart: t(p.projektstart),
      forventetAfslutning: t(p.forventetAfslutning),
      antalTjekpunkter: punkter.length,
      antalAfkrydsede: punkter.filter((x) => x.afkrydset).length,
    };
  });
}

/** Hele kundeprojektet med alle sektioner. */
export async function loadKundeprojekt(id: string): Promise<KundeprojektDTO | null> {
  const p = await withDbRetry(
    () =>
      prisma.clientProject.findUnique({
        where: { id },
        include: {
          projektansvarlig: { select: { name: true } },
          baser: {
            orderBy: { nummer: "asc" },
            include: {
              steps: { orderBy: { position: "asc" } },
              tjekliste: { orderBy: { position: "asc" } },
              kpier: { orderBy: { position: "asc" } },
              kanaler: { orderBy: { position: "asc" } },
              faser: { orderBy: { trin: "asc" } },
              scoringRegler: { orderBy: { position: "asc" } },
              automatiseringer: { orderBy: { position: "asc" } },
            },
          },
          afdaekning: { orderBy: { position: "asc" } },
          ejerskab: { orderBy: { position: "asc" } },
          aendringer: { orderBy: { createdAt: "asc" } },
          reviews: { orderBy: { createdAt: "asc" } },
          risici: { orderBy: { createdAt: "asc" } },
          beslutninger: { orderBy: { createdAt: "asc" } },
          moeder: {
            orderBy: { createdAt: "desc" },
            include: { skridt: { orderBy: { position: "asc" } } },
          },
        },
      }),
    "kundeprojekt:detalje",
  );
  if (!p) return null;

  const baser: BaseDTO[] = p.baser.map((b) => ({
    id: b.id,
    nummer: b.nummer,
    navn: b.navn,
    status: b.status,
    ansvarlig: t(b.ansvarlig),
    startdato: t(b.startdato),
    maaldato: t(b.maaldato),
    godkendtDato: b.godkendtDato,
    godkendtAfNavn: b.godkendtAfNavn,
    steps: b.steps.map((s) => ({
      id: s.id,
      kode: s.kode,
      titel: s.titel,
      beskrivelse: s.beskrivelse,
      aktiviteter: t(s.aktiviteter),
      ejer: t(s.ejer),
      deadline: t(s.deadline),
      status: s.status,
    })),
    tjekliste: b.tjekliste.map((c) => ({
      id: c.id,
      tekst: c.tekst,
      afkrydset: c.afkrydset,
      dato: c.afkrydsetDato ? c.afkrydsetDato.toISOString().slice(0, 10) : null,
      afkrydsetAf: c.afkrydsetAfNavn,
    })),
    kpier: b.kpier.map((k) => ({
      id: k.id,
      navn: k.navn,
      beskrivelse: k.beskrivelse,
      baseline: t(k.baseline),
      maal: t(k.maal),
      aktuel: t(k.aktuel),
      maaledato: t(k.maaledato),
      kilde: t(k.kilde),
    })),
    kanaler: b.kanaler.map((k) => ({
      id: k.id,
      kanal: k.kanal,
      aktiv: k.aktiv,
      budget: t(k.budget),
      landingsside: t(k.landingsside),
      sporingSatOp: k.sporingSatOp,
      ansvarlig: t(k.ansvarlig),
    })),
    faser: b.faser.map((f) => ({
      id: f.id,
      trin: f.trin,
      fase: f.fase,
      kriterie: t(f.kriterie),
      ejer: t(f.ejer),
      automatisering: t(f.automatisering),
    })),
    scoringRegler: b.scoringRegler.map((r) => ({
      id: r.id,
      kriterie: r.kriterie,
      type: r.type,
      point: t(r.point),
      note: t(r.note),
    })),
    automatiseringer: b.automatiseringer.map((a) => ({
      id: a.id,
      navn: a.navn,
      trigger: t(a.trigger),
      handling: t(a.handling),
      vaerktoej: t(a.vaerktoej),
      status: a.status,
      ejer: t(a.ejer),
    })),
  }));

  return {
    id: p.id,
    kundeNavn: p.kundeNavn,
    cvr: t(p.cvr),
    kontaktpersonNavn: t(p.kontaktpersonNavn),
    kontaktpersonTitel: t(p.kontaktpersonTitel),
    kontaktpersonMail: t(p.kontaktpersonMail),
    kontaktpersonTelefon: t(p.kontaktpersonTelefon),
    deltagere: t(p.deltagere),
    projektstart: t(p.projektstart),
    forventetAfslutning: t(p.forventetAfslutning),
    nuvaerendeBase: p.nuvaerendeBase,
    samletStatus: p.samletStatus,
    kadence: t(p.kadence),
    hubspotPortal: t(p.hubspotPortal),
    projektmappe: t(p.projektmappe),
    formaal: t(p.formaal),
    udgangspunktKanaler: t(p.udgangspunktKanaler),
    udgangspunktLeadsPrMaaned: t(p.udgangspunktLeadsPrMaaned),
    udgangspunktSalgsproces: t(p.udgangspunktSalgsproces),
    udgangspunktCrmModenhed: t(p.udgangspunktCrmModenhed),
    udgangspunktAutomatisering: t(p.udgangspunktAutomatisering),
    udgangspunktHvorTabes: t(p.udgangspunktHvorTabes),
    vigtigsteFund: t(p.vigtigsteFund),
    kundeId: p.customerId,
    projektansvarligId: p.projektansvarligId,
    projektansvarligNavn: p.projektansvarlig?.name ?? null,
    baser,
    afdaekning: p.afdaekning.map((a) => ({
      id: a.id,
      kode: a.kode,
      aktivitet: a.aktivitet,
      ejer: t(a.ejer),
      deadline: t(a.deadline),
      status: a.status,
      noter: t(a.noter),
    })),
    ejerskab: p.ejerskab.map((e) => ({
      id: e.id,
      omraade: e.omraade,
      ejerHosKunden: t(e.ejerHosKunden),
      ejerHosThirdbase: t(e.ejerHosThirdbase),
      gennemgang: t(e.gennemgang),
    })),
    aendringer: p.aendringer.map((a) => ({
      id: a.id,
      version: a.version,
      dato: t(a.dato),
      hvadBlevAendret: a.hvadBlevAendret,
      hvorfor: t(a.hvorfor),
      aendretAf: t(a.aendretAf),
      resultat: t(a.resultat),
    })),
    reviews: p.reviews.map((r) => ({
      id: r.id,
      dato: t(r.dato),
      deltagere: t(r.deltagere),
      vigtigsteFund: t(r.vigtigsteFund),
      besluttedeOptimeringer: t(r.besluttedeOptimeringer),
      naesteReview: t(r.naesteReview),
    })),
    risici: p.risici.map((r) => ({
      id: r.id,
      kode: r.kode,
      beskrivelse: r.beskrivelse,
      base: t(r.base),
      konsekvens: t(r.konsekvens),
      haandtering: t(r.haandtering),
      ejer: t(r.ejer),
      status: r.status,
    })),
    beslutninger: p.beslutninger.map((b) => ({
      id: b.id,
      dato: t(b.dato),
      beslutning: b.beslutning,
      baggrund: t(b.baggrund),
      besluttetAf: t(b.besluttetAf),
    })),
    moeder: p.moeder.map((m) => ({
      id: m.id,
      dato: t(m.dato),
      deltagere: t(m.deltagere),
      nuvaerendeBase: t(m.nuvaerendeBase),
      sidenSidst: t(m.sidenSidst),
      kpiBevaegelse: t(m.kpiBevaegelse),
      blokeringer: t(m.blokeringer),
      beslutninger: t(m.beslutninger),
      naesteMoede: t(m.naesteMoede),
      skridt: m.skridt.map((s) => ({ id: s.id, opgave: s.opgave, ejer: t(s.ejer), deadline: t(s.deadline) })),
    })),
  };
}

/** Retning ud fra baseline og aktuel. Tal sammenlignes, ellers uændret. */
export function beregnRetning(baseline: string, aktuel: string): string {
  const tal = (v: string) => {
    const n = parseFloat(v.replace(/[^0-9,.-]/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };
  const b = tal(baseline);
  const a = tal(aktuel);
  if (b === null || a === null) return "→";
  if (a > b) return "↑";
  if (a < b) return "↓";
  return "→";
}

/** Samler alle 12 KPI'er på tværs af baserne til sektion 6. */
export function samletKpiOverblik(projekt: KundeprojektDTO): KpiOverblikDTO[] {
  const ud: KpiOverblikDTO[] = [];
  for (const b of projekt.baser) {
    for (const k of b.kpier) {
      ud.push({
        id: k.id,
        base: baseEtiket(b.nummer),
        navn: k.navn,
        baseline: k.baseline,
        maal: k.maal,
        aktuel: k.aktuel,
        retning: beregnRetning(k.baseline, k.aktuel),
      });
    }
  }
  return ud;
}
