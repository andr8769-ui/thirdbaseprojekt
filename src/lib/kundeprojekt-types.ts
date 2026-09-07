// DTO-typer for kundeprojekter. Danske feltnavne som i lib/types.ts, så
// klienten arbejder på samme slags objekter som resten af appen.

export type StepDTO = {
  id: string;
  kode: string;
  titel: string;
  beskrivelse: string;
  aktiviteter: string;
  ejer: string;
  deadline: string;
  status: string;
};

export type TjekpunktDTO = {
  id: string;
  tekst: string;
  afkrydset: boolean;
  dato: string | null;
  afkrydsetAf: string | null;
};

export type KpiDTO = {
  id: string;
  navn: string;
  beskrivelse: string;
  baseline: string;
  maal: string;
  aktuel: string;
  maaledato: string;
  kilde: string;
};

export type KanalDTO = {
  id: string;
  kanal: string;
  aktiv: boolean;
  budget: string;
  landingsside: string;
  sporingSatOp: boolean;
  ansvarlig: string;
};

export type FaseDTO = {
  id: string;
  trin: number;
  fase: string;
  kriterie: string;
  ejer: string;
  automatisering: string;
};

export type ScoringDTO = {
  id: string;
  kriterie: string;
  type: string;
  point: string;
  note: string;
};

export type AutomatiseringDTO = {
  id: string;
  navn: string;
  trigger: string;
  handling: string;
  vaerktoej: string;
  status: string;
  ejer: string;
};

export type BaseDTO = {
  id: string;
  nummer: number;
  navn: string;
  status: string;
  ansvarlig: string;
  startdato: string;
  maaldato: string;
  godkendtDato: string | null;
  godkendtAfNavn: string | null;
  steps: StepDTO[];
  tjekliste: TjekpunktDTO[];
  kpier: KpiDTO[];
  kanaler: KanalDTO[];
  faser: FaseDTO[];
  scoringRegler: ScoringDTO[];
  automatiseringer: AutomatiseringDTO[];
};

export type AfdaekningDTO = {
  id: string;
  kode: string;
  aktivitet: string;
  ejer: string;
  deadline: string;
  status: string;
  noter: string;
};

export type EjerskabDTO = {
  id: string;
  omraade: string;
  ejerHosKunden: string;
  ejerHosThirdbase: string;
  gennemgang: string;
};

export type AendringDTO = {
  id: string;
  version: string;
  dato: string;
  hvadBlevAendret: string;
  hvorfor: string;
  aendretAf: string;
  resultat: string;
};

export type ReviewDTO = {
  id: string;
  dato: string;
  deltagere: string;
  vigtigsteFund: string;
  besluttedeOptimeringer: string;
  naesteReview: string;
};

export type RisikoDTO = {
  id: string;
  kode: string;
  beskrivelse: string;
  base: string;
  konsekvens: string;
  haandtering: string;
  ejer: string;
  status: string;
};

export type BeslutningDTO = {
  id: string;
  dato: string;
  beslutning: string;
  baggrund: string;
  besluttetAf: string;
};

export type MoedeSkridtDTO = { id: string; opgave: string; ejer: string; deadline: string };

export type StatusmoedeDTO = {
  id: string;
  dato: string;
  deltagere: string;
  nuvaerendeBase: string;
  sidenSidst: string;
  kpiBevaegelse: string;
  blokeringer: string;
  beslutninger: string;
  naesteMoede: string;
  skridt: MoedeSkridtDTO[];
};

export type KundeprojektDTO = {
  id: string;
  kundeNavn: string;
  cvr: string;
  kontaktpersonNavn: string;
  kontaktpersonTitel: string;
  kontaktpersonMail: string;
  kontaktpersonTelefon: string;
  deltagere: string;
  projektstart: string;
  forventetAfslutning: string;
  nuvaerendeBase: string;
  samletStatus: string;
  kadence: string;
  hubspotPortal: string;
  projektmappe: string;
  formaal: string;
  udgangspunktKanaler: string;
  udgangspunktLeadsPrMaaned: string;
  udgangspunktSalgsproces: string;
  udgangspunktCrmModenhed: string;
  udgangspunktAutomatisering: string;
  udgangspunktHvorTabes: string;
  vigtigsteFund: string;
  kundeId: string | null;
  projektansvarligId: string | null;
  projektansvarligNavn: string | null;
  baser: BaseDTO[];
  afdaekning: AfdaekningDTO[];
  ejerskab: EjerskabDTO[];
  aendringer: AendringDTO[];
  reviews: ReviewDTO[];
  risici: RisikoDTO[];
  beslutninger: BeslutningDTO[];
  moeder: StatusmoedeDTO[];
};

/** Række i det samlede KPI-overblik (sektion 6). */
export type KpiOverblikDTO = {
  id: string;
  base: string;
  navn: string;
  baseline: string;
  maal: string;
  aktuel: string;
  retning: string;
};

/** Kort visning på oversigtssiden. */
export type KundeprojektKortDTO = {
  id: string;
  kundeNavn: string;
  /** Den Customer projektet er koblet til, hvis nogen. Bruges til gruppering. */
  tilknyttetKundeId: string | null;
  tilknyttetKundeNavn: string | null;
  nuvaerendeBase: string;
  samletStatus: string;
  projektansvarligNavn: string | null;
  projektstart: string;
  forventetAfslutning: string;
  antalTjekpunkter: number;
  antalAfkrydsede: number;
};
