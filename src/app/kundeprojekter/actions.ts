"use server";

// ------------------------------------------------------------------
// Server actions for kundeprojekter bygget på The Thirdbase Model.
//
// Ligger i sin egen fil, så src/app/actions.ts ikke røres. Rettigheder
// håndhæves HER på serveren, ikke kun i UI'et:
//   - kun admin må oprette og slette kundeprojekter
//   - enhver logget-ind bruger må opdatere status, tjeklister og KPI-værdier
// ------------------------------------------------------------------

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/db";
import { erAdmin, dagsDato } from "@/lib/constants";
import {
  BASER,
  AFDAEKNING,
  MARKETINGKANALER,
  PIPELINE_FASER,
  LEAD_SCORING_RAEKKER,
  AUTOMATISERING_RAEKKER,
  EJERSKABSOMRAADER,
  FOERSTE_AENDRING,
  PROJEKT_STATUS,
  baseEtiket,
} from "@/lib/thirdbase-template";
import { sendBaseGodkendtMail } from "@/lib/baseMail";

export type Resultat = { ok: boolean; reason?: string; id?: string };

/** Samme mønster som actor() i src/app/actions.ts, men lokal så den fil ikke røres. */
async function bruger() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke logget ind");
  const dbu = await withDbRetry(
    () => prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, role: true } }),
    "kundeprojekt:bruger",
  );
  return {
    id: session.user.id,
    navn: dbu?.name || session.user.name || "En bruger",
    role: dbu?.role || session.user.role || "Medarbejder",
  };
}

const MAX_TEKST = 4000;
const rens = (v: unknown): string => String(v ?? "").trim().slice(0, MAX_TEKST);
const gyldigStatus = (s: string) => (PROJEKT_STATUS as readonly string[]).includes(s);

function opdaterSti(projektId: string) {
  revalidatePath(`/kundeprojekter/${projektId}`);
  revalidatePath("/kundeprojekter");
}

// ------------------------------------------------------------------
// Oprettelse ud fra skabelonen (kun admin)
// ------------------------------------------------------------------

export type NytProjektInput = {
  kundeNavn: string;
  cvr: string;
  kontaktpersonNavn: string;
  kontaktpersonTitel: string;
  kontaktpersonMail: string;
  kontaktpersonTelefon: string;
  projektansvarligId: string;
  deltagere: string;
  projektstart: string;
  forventetAfslutning: string;
  kadence: string;
  hubspotPortal: string;
  projektmappe: string;
  formaal: string;
  kundeId: string;
  udgangspunktKanaler: string;
  udgangspunktLeadsPrMaaned: string;
  udgangspunktSalgsproces: string;
  udgangspunktCrmModenhed: string;
  udgangspunktAutomatisering: string;
  udgangspunktHvorTabes: string;
};

/**
 * Opretter et kundeprojekt og kopierer HELE skabelonen ind i databasen.
 * Skabelonteksterne kommer fra lib/thirdbase-template.ts og kan ikke
 * redigeres af brugerne. Alt sker i én transaktion.
 */
export async function opretKundeprojekt(input: NytProjektInput): Promise<Resultat> {
  const me = await bruger();
  if (!erAdmin(me.role)) return { ok: false, reason: "Kun administratorer kan oprette kundeprojekter." };

  const kundeNavn = rens(input.kundeNavn);
  if (!kundeNavn) return { ok: false, reason: "Angiv et kundenavn." };
  if (kundeNavn.length > 120) return { ok: false, reason: "Kundenavnet må højst være 120 tegn." };

  const projektansvarligId = rens(input.projektansvarligId) || null;
  const kundeId = rens(input.kundeId) || null;

  const projekt = await withDbRetry(
    () =>
      prisma.clientProject.create({
        data: {
          kundeNavn,
          cvr: rens(input.cvr) || null,
          kontaktpersonNavn: rens(input.kontaktpersonNavn) || null,
          kontaktpersonTitel: rens(input.kontaktpersonTitel) || null,
          kontaktpersonMail: rens(input.kontaktpersonMail) || null,
          kontaktpersonTelefon: rens(input.kontaktpersonTelefon) || null,
          deltagere: rens(input.deltagere) || null,
          projektstart: rens(input.projektstart) || null,
          forventetAfslutning: rens(input.forventetAfslutning) || null,
          kadence: rens(input.kadence) || null,
          hubspotPortal: rens(input.hubspotPortal) || null,
          projektmappe: rens(input.projektmappe) || null,
          formaal: rens(input.formaal) || null,
          udgangspunktKanaler: rens(input.udgangspunktKanaler) || null,
          udgangspunktLeadsPrMaaned: rens(input.udgangspunktLeadsPrMaaned) || null,
          udgangspunktSalgsproces: rens(input.udgangspunktSalgsproces) || null,
          udgangspunktCrmModenhed: rens(input.udgangspunktCrmModenhed) || null,
          udgangspunktAutomatisering: rens(input.udgangspunktAutomatisering) || null,
          udgangspunktHvorTabes: rens(input.udgangspunktHvorTabes) || null,
          nuvaerendeBase: "1",
          samletStatus: "Ikke startet",
          customerId: kundeId,
          projektansvarligId,
          opretterId: me.id,

          // Afdækning A1 til A6
          afdaekning: {
            create: AFDAEKNING.map((a, i) => ({ kode: a.kode, aktivitet: a.aktivitet, position: i })),
          },
          // Home · Ejerskab og kadence
          ejerskab: {
            create: EJERSKABSOMRAADER.map((o, i) => ({ omraade: o, position: i })),
          },
          // Home · Ændringslog, første version
          aendringer: {
            create: [{ version: FOERSTE_AENDRING.version, hvadBlevAendret: FOERSTE_AENDRING.hvadBlevAendret }],
          },
          // De fire baser med steps, tjekliste, KPI'er og base-specifikke tabeller
          baser: {
            create: BASER.map((b) => ({
              nummer: b.nummer,
              navn: b.navn,
              status: "Ikke startet",
              steps: {
                create: b.steps.map((s, i) => ({
                  kode: s.kode,
                  titel: s.titel,
                  beskrivelse: s.beskrivelse,
                  position: i,
                })),
              },
              tjekliste: { create: b.tjekliste.map((tekst, i) => ({ tekst, position: i })) },
              kpier: {
                create: b.kpier.map((k, i) => ({
                  navn: k.navn,
                  beskrivelse: k.beskrivelse,
                  kilde: k.kilde,
                  position: i,
                })),
              },
              // Base 1 · Valgte kanaler
              kanaler:
                b.nummer === 1
                  ? { create: MARKETINGKANALER.map((kanal, i) => ({ kanal, position: i })) }
                  : undefined,
              // Base 2 · Pipelinens faser og lead scoring
              faser:
                b.nummer === 2 ? { create: PIPELINE_FASER.map((f) => ({ trin: f.trin, fase: f.fase })) } : undefined,
              scoringRegler:
                b.nummer === 2
                  ? { create: LEAD_SCORING_RAEKKER.map((r, i) => ({ type: r.type, position: i })) }
                  : undefined,
              // Base 3 · Automatiseringer
              automatiseringer:
                b.nummer === 3
                  ? { create: Array.from({ length: AUTOMATISERING_RAEKKER }, (_, i) => ({ position: i })) }
                  : undefined,
            })),
          },
        },
        select: { id: true },
      }),
    "kundeprojekt:opret",
  );

  revalidatePath("/kundeprojekter");
  return { ok: true, id: projekt.id };
}

/** Slet et kundeprojekt med alt indhold (kun admin). Cascade rydder resten. */
export async function sletKundeprojekt(projektId: string): Promise<Resultat> {
  const me = await bruger();
  if (!erAdmin(me.role)) return { ok: false, reason: "Kun administratorer kan slette kundeprojekter." };
  const findes = await withDbRetry(
    () => prisma.clientProject.findUnique({ where: { id: projektId }, select: { id: true } }),
    "kundeprojekt:slet:read",
  );
  if (!findes) return { ok: false, reason: "Kundeprojektet findes ikke." };
  await withDbRetry(() => prisma.clientProject.delete({ where: { id: projektId } }), "kundeprojekt:slet");
  revalidatePath("/kundeprojekter");
  return { ok: true };
}

// ------------------------------------------------------------------
// Stamdata (sektion 0)
// ------------------------------------------------------------------

const STAMDATA_FELTER = new Set([
  "cvr",
  "kontaktpersonNavn",
  "kontaktpersonTitel",
  "kontaktpersonMail",
  "kontaktpersonTelefon",
  "deltagere",
  "projektstart",
  "forventetAfslutning",
  "nuvaerendeBase",
  "samletStatus",
  "kadence",
  "hubspotPortal",
  "projektmappe",
  "formaal",
  "udgangspunktKanaler",
  "udgangspunktLeadsPrMaaned",
  "udgangspunktSalgsproces",
  "udgangspunktCrmModenhed",
  "udgangspunktAutomatisering",
  "udgangspunktHvorTabes",
  "vigtigsteFund",
]);

/** Ret ét stamdatafelt. Alle logget-ind brugere må dette. */
export async function opdaterStamdata(projektId: string, felt: string, vaerdi: string): Promise<Resultat> {
  await bruger();
  if (!STAMDATA_FELTER.has(felt)) return { ok: false, reason: "Ukendt felt." };
  const v = rens(vaerdi);
  if (felt === "samletStatus" && v && !gyldigStatus(v)) return { ok: false, reason: "Ugyldig status." };
  await withDbRetry(
    () => prisma.clientProject.update({ where: { id: projektId }, data: { [felt]: v || null } }),
    "kundeprojekt:stamdata",
  );
  opdaterSti(projektId);
  return { ok: true };
}

// ------------------------------------------------------------------
// Afdækning, steps, KPI'er og de base-specifikke tabeller
// ------------------------------------------------------------------

export async function opdaterAfdaekning(id: string, felt: string, vaerdi: string): Promise<Resultat> {
  await bruger();
  if (!["ejer", "deadline", "status", "noter"].includes(felt)) return { ok: false, reason: "Ukendt felt." };
  const v = rens(vaerdi);
  if (felt === "status" && !gyldigStatus(v)) return { ok: false, reason: "Ugyldig status." };
  const r = await withDbRetry(
    () => prisma.discoveryActivity.update({ where: { id }, data: { [felt]: v || null }, select: { projectId: true } }),
    "kundeprojekt:afdaekning",
  );
  opdaterSti(r.projectId);
  return { ok: true };
}

export async function opdaterStep(id: string, felt: string, vaerdi: string): Promise<Resultat> {
  await bruger();
  if (!["aktiviteter", "ejer", "deadline", "status"].includes(felt)) return { ok: false, reason: "Ukendt felt." };
  const v = rens(vaerdi);
  if (felt === "status" && !gyldigStatus(v)) return { ok: false, reason: "Ugyldig status." };
  const r = await withDbRetry(
    () => prisma.baseStep.update({ where: { id }, data: { [felt]: v || null }, select: { base: { select: { projectId: true } } } }),
    "kundeprojekt:step",
  );
  opdaterSti(r.base.projectId);
  return { ok: true };
}

export async function opdaterKpi(id: string, felt: string, vaerdi: string): Promise<Resultat> {
  await bruger();
  if (!["baseline", "maal", "aktuel", "maaledato", "kilde"].includes(felt)) return { ok: false, reason: "Ukendt felt." };
  const r = await withDbRetry(
    () => prisma.kpi.update({ where: { id }, data: { [felt]: rens(vaerdi) || null }, select: { base: { select: { projectId: true } } } }),
    "kundeprojekt:kpi",
  );
  opdaterSti(r.base.projectId);
  return { ok: true };
}

export async function opdaterKanal(id: string, felt: string, vaerdi: string | boolean): Promise<Resultat> {
  await bruger();
  if (!["aktiv", "budget", "landingsside", "sporingSatOp", "ansvarlig"].includes(felt)) {
    return { ok: false, reason: "Ukendt felt." };
  }
  const data =
    felt === "aktiv" || felt === "sporingSatOp" ? { [felt]: !!vaerdi } : { [felt]: rens(vaerdi) || null };
  const r = await withDbRetry(
    () => prisma.marketingChannel.update({ where: { id }, data, select: { base: { select: { projectId: true } } } }),
    "kundeprojekt:kanal",
  );
  opdaterSti(r.base.projectId);
  return { ok: true };
}

export async function opdaterFase(id: string, felt: string, vaerdi: string): Promise<Resultat> {
  await bruger();
  if (!["fase", "kriterie", "ejer", "automatisering"].includes(felt)) return { ok: false, reason: "Ukendt felt." };
  const r = await withDbRetry(
    () => prisma.pipelineStage.update({ where: { id }, data: { [felt]: rens(vaerdi) || null }, select: { base: { select: { projectId: true } } } }),
    "kundeprojekt:fase",
  );
  opdaterSti(r.base.projectId);
  return { ok: true };
}

export async function opdaterScoring(id: string, felt: string, vaerdi: string): Promise<Resultat> {
  await bruger();
  if (!["kriterie", "type", "point", "note"].includes(felt)) return { ok: false, reason: "Ukendt felt." };
  const r = await withDbRetry(
    () => prisma.leadScoringRule.update({ where: { id }, data: { [felt]: rens(vaerdi) }, select: { base: { select: { projectId: true } } } }),
    "kundeprojekt:scoring",
  );
  opdaterSti(r.base.projectId);
  return { ok: true };
}

export async function opdaterAutomatisering(id: string, felt: string, vaerdi: string): Promise<Resultat> {
  await bruger();
  if (!["navn", "trigger", "handling", "vaerktoej", "status", "ejer"].includes(felt)) {
    return { ok: false, reason: "Ukendt felt." };
  }
  const v = rens(vaerdi);
  if (felt === "status" && !gyldigStatus(v)) return { ok: false, reason: "Ugyldig status." };
  const r = await withDbRetry(
    () => prisma.automation.update({ where: { id }, data: { [felt]: v }, select: { base: { select: { projectId: true } } } }),
    "kundeprojekt:automatisering",
  );
  opdaterSti(r.base.projectId);
  return { ok: true };
}

export async function opdaterEjerskab(id: string, felt: string, vaerdi: string): Promise<Resultat> {
  await bruger();
  if (!["ejerHosKunden", "ejerHosThirdbase", "gennemgang"].includes(felt)) return { ok: false, reason: "Ukendt felt." };
  const r = await withDbRetry(
    () => prisma.ownershipArea.update({ where: { id }, data: { [felt]: rens(vaerdi) || null }, select: { projectId: true } }),
    "kundeprojekt:ejerskab",
  );
  opdaterSti(r.projectId);
  return { ok: true };
}

// ------------------------------------------------------------------
// Tjekliste
// ------------------------------------------------------------------

/** Kryds et tjeklistepunkt af eller fra. Gemmer dato og bruger. */
export async function saetTjekpunkt(id: string, afkrydset: boolean): Promise<Resultat> {
  const me = await bruger();
  const r = await withDbRetry(
    () =>
      prisma.checklistItem.update({
        where: { id },
        data: afkrydset
          ? { afkrydset: true, afkrydsetDato: new Date(), afkrydsetAfId: me.id, afkrydsetAfNavn: me.navn }
          : { afkrydset: false, afkrydsetDato: null, afkrydsetAfId: null, afkrydsetAfNavn: null },
        select: { base: { select: { projectId: true } } },
      }),
    "kundeprojekt:tjekpunkt",
  );
  opdaterSti(r.base.projectId);
  return { ok: true };
}

// ------------------------------------------------------------------
// Base · status, felter og godkendelse
// ------------------------------------------------------------------

export async function opdaterBaseFelt(id: string, felt: string, vaerdi: string): Promise<Resultat> {
  await bruger();
  if (!["ansvarlig", "startdato", "maaldato"].includes(felt)) return { ok: false, reason: "Ukendt felt." };
  const r = await withDbRetry(
    () => prisma.projectBase.update({ where: { id }, data: { [felt]: rens(vaerdi) || null }, select: { projectId: true } }),
    "kundeprojekt:basefelt",
  );
  opdaterSti(r.projectId);
  return { ok: true };
}

/**
 * Skift status på en base.
 *
 * GATE: en base kan ikke sættes til Færdig, før alle fem tjeklistepunkter i
 * den FORRIGE base er afkrydset. Base 1 har ingen forudgående base og er
 * derfor ikke gated. Afvisningen kommer tilbage som en tydelig besked, så
 * UI'et kan vise hvorfor der ikke skete noget.
 */
/**
 * Gate-reglen, ét sted så status og godkendelse ikke kan komme i utakt.
 *
 * En base kan først markeres som Færdig eller godkendes, når
 *   1) alle punkter i basens EGEN tjekliste er afkrydset, og
 *   2) for Base 2, Base 3 og Home derudover alle punkter i den FORRIGE
 *      bases tjekliste er afkrydset.
 *
 * Base 1 gates altså af sin egen tjekliste, men har ingen forudgående base.
 * Beskeden siger præcis hvor mange punkter der mangler og i hvilken base.
 */
async function tjekGate(baseId: string, handling: "markeres som Færdig" | "godkendes"): Promise<Resultat> {
  const base = await withDbRetry(
    () =>
      prisma.projectBase.findUnique({
        where: { id: baseId },
        select: { nummer: true, projectId: true, tjekliste: { select: { afkrydset: true } } },
      }),
    "kundeprojekt:gate:egen",
  );
  if (!base) return { ok: false, reason: "Basen findes ikke." };

  const manglerEgen = base.tjekliste.filter((t) => !t.afkrydset).length;
  if (manglerEgen > 0) {
    return {
      ok: false,
      reason:
        `${baseEtiket(base.nummer)} kan ikke ${handling} endnu. ` +
        `Der mangler ${manglerEgen} af ${base.tjekliste.length} punkter i tjeklisten for ${baseEtiket(base.nummer)}.`,
    };
  }

  if (base.nummer > 1) {
    const forrige = await withDbRetry(
      () =>
        prisma.projectBase.findFirst({
          where: { projectId: base.projectId, nummer: base.nummer - 1 },
          select: { nummer: true, tjekliste: { select: { afkrydset: true } } },
        }),
      "kundeprojekt:gate:forrige",
    );
    if (forrige) {
      const manglerForrige = forrige.tjekliste.filter((t) => !t.afkrydset).length;
      if (manglerForrige > 0) {
        return {
          ok: false,
          reason:
            `${baseEtiket(base.nummer)} kan ikke ${handling} endnu. ` +
            `Der mangler ${manglerForrige} af ${forrige.tjekliste.length} punkter i tjeklisten for ${baseEtiket(forrige.nummer)}.`,
        };
      }
    }
  }

  return { ok: true };
}

export async function saetBaseStatus(id: string, status: string): Promise<Resultat> {
  await bruger();
  if (!gyldigStatus(status)) return { ok: false, reason: "Ugyldig status." };

  const base = await withDbRetry(
    () => prisma.projectBase.findUnique({ where: { id }, select: { id: true, projectId: true } }),
    "kundeprojekt:basestatus:read",
  );
  if (!base) return { ok: false, reason: "Basen findes ikke." };

  if (status === "Færdig") {
    const gate = await tjekGate(id, "markeres som Færdig");
    if (!gate.ok) return gate;
  }

  await withDbRetry(() => prisma.projectBase.update({ where: { id }, data: { status } }), "kundeprojekt:basestatus");
  opdaterSti(base.projectId);
  return { ok: true };
}

/**
 * Godkend en base. Sætter godkendtDato og godkendtAf, og sender den ene nye
 * mail til projektansvarlig. Samme gate som ved status Færdig.
 */
export async function godkendBase(id: string): Promise<Resultat> {
  const me = await bruger();

  const base = await withDbRetry(
    () =>
      prisma.projectBase.findUnique({
        where: { id },
        select: {
          id: true,
          nummer: true,
          navn: true,
          godkendtDato: true,
          projectId: true,
          project: {
            select: {
              kundeNavn: true,
              projektansvarlig: { select: { name: true, email: true, emailNotifications: true } },
            },
          },
        },
      }),
    "kundeprojekt:godkend:read",
  );
  if (!base) return { ok: false, reason: "Basen findes ikke." };
  if (base.godkendtDato) return { ok: false, reason: `${baseEtiket(base.nummer)} er allerede godkendt.` };

  // Samme gate som ved status Færdig: egen tjekliste, og for Base 2, 3 og
  // Home derudover den forrige bases tjekliste.
  const gate = await tjekGate(id, "godkendes");
  if (!gate.ok) return gate;

  const idag = dagsDato();
  await withDbRetry(
    () =>
      prisma.projectBase.update({
        where: { id },
        data: { godkendtDato: idag, godkendtAfId: me.id, godkendtAfNavn: me.navn, status: "Færdig" },
      }),
    "kundeprojekt:godkend",
  );

  // Mail sendes out-of-band, så handlingen returnerer med det samme.
  const ansvarlig = base.project.projektansvarlig;
  if (ansvarlig?.email && ansvarlig.emailNotifications !== false) {
    after(async () => {
      await sendBaseGodkendtMail({
        til: ansvarlig.email,
        modtagerNavn: ansvarlig.name,
        kundeNavn: base.project.kundeNavn,
        baseEtiket: baseEtiket(base.nummer),
        baseNavn: base.navn,
        godkendtAf: me.navn,
        godkendtDato: idag,
        projektId: base.projectId,
      });
    });
  } else {
    console.log(
      `[kundeprojekt] ingen godkendelsesmail: projektansvarlig mangler, eller e-mail-notifikationer er slået fra.`,
    );
  }

  opdaterSti(base.projectId);
  return { ok: true };
}

// ------------------------------------------------------------------
// Risici, beslutninger, ændringslog, reviews og statusmøder
// ------------------------------------------------------------------

export async function tilfoejRisiko(projektId: string): Promise<Resultat> {
  await bruger();
  const antal = await withDbRetry(
    () => prisma.projectRisk.count({ where: { projectId: projektId } }),
    "kundeprojekt:risiko:count",
  );
  await withDbRetry(
    () => prisma.projectRisk.create({ data: { projectId: projektId, kode: `R${antal + 1}` } }),
    "kundeprojekt:risiko:opret",
  );
  opdaterSti(projektId);
  return { ok: true };
}

export async function opdaterRisiko(id: string, felt: string, vaerdi: string): Promise<Resultat> {
  await bruger();
  if (!["beskrivelse", "base", "konsekvens", "haandtering", "ejer", "status"].includes(felt)) {
    return { ok: false, reason: "Ukendt felt." };
  }
  const r = await withDbRetry(
    () => prisma.projectRisk.update({ where: { id }, data: { [felt]: rens(vaerdi) }, select: { projectId: true } }),
    "kundeprojekt:risiko",
  );
  opdaterSti(r.projectId);
  return { ok: true };
}

export async function sletRisiko(id: string): Promise<Resultat> {
  const me = await bruger();
  if (!erAdmin(me.role)) return { ok: false, reason: "Kun administratorer kan slette rækker." };
  const r = await withDbRetry(() => prisma.projectRisk.delete({ where: { id }, select: { projectId: true } }), "kundeprojekt:risiko:slet");
  opdaterSti(r.projectId);
  return { ok: true };
}

export async function tilfoejBeslutning(projektId: string): Promise<Resultat> {
  await bruger();
  await withDbRetry(
    () => prisma.projectDecision.create({ data: { projectId: projektId, dato: dagsDato() } }),
    "kundeprojekt:beslutning:opret",
  );
  opdaterSti(projektId);
  return { ok: true };
}

export async function opdaterBeslutning(id: string, felt: string, vaerdi: string): Promise<Resultat> {
  await bruger();
  if (!["dato", "beslutning", "baggrund", "besluttetAf"].includes(felt)) return { ok: false, reason: "Ukendt felt." };
  const r = await withDbRetry(
    () => prisma.projectDecision.update({ where: { id }, data: { [felt]: rens(vaerdi) }, select: { projectId: true } }),
    "kundeprojekt:beslutning",
  );
  opdaterSti(r.projectId);
  return { ok: true };
}

export async function tilfoejAendring(projektId: string): Promise<Resultat> {
  await bruger();
  const antal = await withDbRetry(
    () => prisma.changeLogEntry.count({ where: { projectId: projektId } }),
    "kundeprojekt:aendring:count",
  );
  await withDbRetry(
    () => prisma.changeLogEntry.create({ data: { projectId: projektId, version: `1.${antal}`, dato: dagsDato() } }),
    "kundeprojekt:aendring:opret",
  );
  opdaterSti(projektId);
  return { ok: true };
}

export async function opdaterAendring(id: string, felt: string, vaerdi: string): Promise<Resultat> {
  await bruger();
  if (!["version", "dato", "hvadBlevAendret", "hvorfor", "aendretAf", "resultat"].includes(felt)) {
    return { ok: false, reason: "Ukendt felt." };
  }
  const r = await withDbRetry(
    () => prisma.changeLogEntry.update({ where: { id }, data: { [felt]: rens(vaerdi) }, select: { projectId: true } }),
    "kundeprojekt:aendring",
  );
  opdaterSti(r.projectId);
  return { ok: true };
}

export async function tilfoejReview(projektId: string): Promise<Resultat> {
  await bruger();
  await withDbRetry(
    () => prisma.performanceReview.create({ data: { projectId: projektId, dato: dagsDato() } }),
    "kundeprojekt:review:opret",
  );
  opdaterSti(projektId);
  return { ok: true };
}

export async function opdaterReview(id: string, felt: string, vaerdi: string): Promise<Resultat> {
  await bruger();
  if (!["dato", "deltagere", "vigtigsteFund", "besluttedeOptimeringer", "naesteReview"].includes(felt)) {
    return { ok: false, reason: "Ukendt felt." };
  }
  const r = await withDbRetry(
    () => prisma.performanceReview.update({ where: { id }, data: { [felt]: rens(vaerdi) }, select: { projectId: true } }),
    "kundeprojekt:review",
  );
  opdaterSti(r.projectId);
  return { ok: true };
}

export async function tilfoejStatusmoede(projektId: string): Promise<Resultat> {
  await bruger();
  const projekt = await withDbRetry(
    () => prisma.clientProject.findUnique({ where: { id: projektId }, select: { nuvaerendeBase: true } }),
    "kundeprojekt:moede:read",
  );
  await withDbRetry(
    () =>
      prisma.statusMeeting.create({
        data: {
          projectId: projektId,
          dato: dagsDato(),
          nuvaerendeBase: projekt?.nuvaerendeBase ?? null,
          skridt: { create: [{ position: 0 }] },
        },
      }),
    "kundeprojekt:moede:opret",
  );
  opdaterSti(projektId);
  return { ok: true };
}

export async function opdaterStatusmoede(id: string, felt: string, vaerdi: string): Promise<Resultat> {
  await bruger();
  const tilladte = [
    "dato",
    "deltagere",
    "nuvaerendeBase",
    "sidenSidst",
    "kpiBevaegelse",
    "blokeringer",
    "beslutninger",
    "naesteMoede",
  ];
  if (!tilladte.includes(felt)) return { ok: false, reason: "Ukendt felt." };
  const r = await withDbRetry(
    () => prisma.statusMeeting.update({ where: { id }, data: { [felt]: rens(vaerdi) }, select: { projectId: true } }),
    "kundeprojekt:moede",
  );
  opdaterSti(r.projectId);
  return { ok: true };
}

export async function tilfoejMoedeSkridt(moedeId: string): Promise<Resultat> {
  await bruger();
  const antal = await withDbRetry(
    () => prisma.statusMeetingAction.count({ where: { meetingId: moedeId } }),
    "kundeprojekt:skridt:count",
  );
  const r = await withDbRetry(
    () =>
      prisma.statusMeetingAction.create({
        data: { meetingId: moedeId, position: antal },
        select: { meeting: { select: { projectId: true } } },
      }),
    "kundeprojekt:skridt:opret",
  );
  opdaterSti(r.meeting.projectId);
  return { ok: true };
}

export async function opdaterMoedeSkridt(id: string, felt: string, vaerdi: string): Promise<Resultat> {
  await bruger();
  if (!["opgave", "ejer", "deadline"].includes(felt)) return { ok: false, reason: "Ukendt felt." };
  const r = await withDbRetry(
    () =>
      prisma.statusMeetingAction.update({
        where: { id },
        data: { [felt]: rens(vaerdi) },
        select: { meeting: { select: { projectId: true } } },
      }),
    "kundeprojekt:skridt",
  );
  opdaterSti(r.meeting.projectId);
  return { ok: true };
}
