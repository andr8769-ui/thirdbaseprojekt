// ------------------------------------------------------------------
// The Thirdbase Model — fast projektskabelon til kundeforløb.
//
// Alle faste tekster i skabelonen står HER og kun her. Når et nyt
// kundeprojekt oprettes, kopieres indholdet ind i databasen, og derefter
// er det kun de udfyldte værdier brugerne redigerer. Selve skabelonen kan
// ikke redigeres fra UI'et.
//
// Ingen React- eller Prisma-afhængigheder, så både server og klient kan
// læse herfra (samme princip som lib/constants.ts).
// ------------------------------------------------------------------

/** Statusværdier i skabelonen. Bemærk at de bevidst er en anden liste end
 *  opgavernes STATUS i constants.ts, som denne fil ikke rører. */
export const PROJEKT_STATUS = ["Ikke startet", "I gang", "Blokeret", "Færdig"] as const;
export type ProjektStatus = (typeof PROJEKT_STATUS)[number];

/** Farver til statusvisning, taget fra det eksisterende designsystem. */
export const PROJEKT_STATUS_FARVE: Record<string, string> = {
  "Ikke startet": "#C4C7CE",
  "I gang": "#3355FF",
  Blokeret: "#FF442B",
  Færdig: "#16A34A",
};

/** Åben eller lukket, brugt på risici. */
export const RISIKO_STATUS = ["Åben", "Lukket"] as const;

/** Nuværende base på et kundeprojekt. 4 er Home. */
export const BASE_VALG = ["1", "2", "3", "Home"] as const;

/** CRM-modenhed i kundens udgangspunkt. */
export const CRM_MODENHED = ["Ingen CRM", "HubSpot delvist", "HubSpot fuldt"] as const;

/** Retning i det samlede KPI-overblik. */
export const RETNINGER = ["↑", "↓", "→"] as const;
export type Retning = (typeof RETNINGER)[number];

// ------------------------------------------------------------------
// Afdækning
// ------------------------------------------------------------------
export type SkabelonAfdaekning = { kode: string; aktivitet: string };

export const AFDAEKNING: SkabelonAfdaekning[] = [
  { kode: "A1", aktivitet: "Kortlæg alle nuværende marketingkanaler og budget pr. kanal" },
  { kode: "A2", aktivitet: "Gennemgå eksisterende pipeline og CRM-opsætning" },
  { kode: "A3", aktivitet: "Indsaml tilgængelige data om leads, konvertering og omsætning" },
  { kode: "A4", aktivitet: "Identificér hvor leads og omsætning tabes i dag" },
  { kode: "A5", aktivitet: "Fastlæg baseline for alle KPI'er i skabelonen" },
  { kode: "A6", aktivitet: "Afstem forventninger, tidsplan og ejerskab med kunden" },
];

// ------------------------------------------------------------------
// De fire baser
// ------------------------------------------------------------------
export type SkabelonStep = { kode: string; titel: string; beskrivelse: string };
export type SkabelonKpi = { navn: string; beskrivelse: string; kilde: string };

export type SkabelonBase = {
  nummer: number; // 1, 2, 3, 4 hvor 4 er Home
  navn: string;
  overskrift: string; // fx "Base 1 · Marketing"
  maal: string;
  fokusomraader: string[];
  steps: SkabelonStep[];
  tjekliste: string[];
  tjeklisteOverskrift: string;
  kpier: SkabelonKpi[];
  resultat: string;
  harMaaldato: boolean;
};

export const BASER: SkabelonBase[] = [
  {
    nummer: 1,
    navn: "Marketing",
    overskrift: "Base 1 · Marketing",
    maal:
      "Skab den rigtige efterspørgsel. Relevant synlighed, trafik og interesse hos den rigtige målgruppe. " +
      "Målet er ikke mest mulig trafik, men trafik der kan blive til kunder.",
    fokusomraader: ["Paid Search", "Organic Search / SEO", "Paid Social", "Content Marketing", "Email Marketing"],
    steps: [
      {
        kode: "1.1",
        titel: "Definér målgruppe og købsintention",
        beskrivelse: "Beskriv hvem den ideelle kunde er, og hvilke behov der udløser et køb.",
      },
      {
        kode: "1.2",
        titel: "Vælg kanaler ud fra hvor målgruppen er",
        beskrivelse: "Prioritér efter målgruppens adfærd, ikke vane.",
      },
      { kode: "1.3", titel: "Byg budskaber og landingssider pr. kanal, så besøg bliver til leads", beskrivelse: "" },
      {
        kode: "1.4",
        titel: "Sæt sporing op og fordel budgettet, så det kan flyttes mod det, der skaber kundeemner",
        beskrivelse: "",
      },
    ],
    tjeklisteOverskrift: "Tjekliste (gate til Base 2)",
    tjekliste: [
      "Ideel målgruppe er beskrevet og dokumenteret",
      "Kanaler er valgt ud fra data, ikke vane",
      "Landingssider findes for hver aktiv kanal",
      "Konverteringssporing er aktiv på alle kanaler",
      "Budget kan følges pr. kanal",
    ],
    kpier: [
      {
        navn: "Antal kvalificerede leads pr. måned",
        beskrivelse: "Det vigtigste mål for, om efterspørgslen er den rigtige",
        kilde: "HubSpot / GA4",
      },
      {
        navn: "Pris pr. lead pr. kanal",
        beskrivelse: "Viser hvilke kanaler der bør skaleres eller skæres",
        kilde: "Annonceplatform",
      },
      {
        navn: "Konverteringsrate på landingssider",
        beskrivelse: "Måler om besøg reelt bliver til kundeemner",
        kilde: "GA4 / HubSpot",
      },
    ],
    resultat:
      "En mere målrettet marketingindsats, hvor tid og budget bruges på de kanaler, der reelt kan skabe kunder.",
    harMaaldato: true,
  },
  {
    nummer: 2,
    navn: "Sales Optimization",
    overskrift: "Base 2 · Sales Optimization",
    maal:
      "Gør leads til kunder. En systematisk og målbar salgsproces, hvor leads ikke tabes. " +
      "Fokus flytter fra tilfældig opfølgning til en proces, der kan styres.",
    fokusomraader: [
      "Pipeline Optimization",
      "HubSpot CRM Optimization",
      "Lead Scoring",
      "Sales Automation",
      "Reporting & Forecasting",
    ],
    steps: [
      {
        kode: "2.1",
        titel: "Definér pipelinens faser",
        beskrivelse: "Beskriv hvert trin fra nyt lead til lukket aftale, så alle arbejder efter samme proces.",
      },
      {
        kode: "2.2",
        titel: "Ryd op i CRM og sæt det rigtigt op",
        beskrivelse: "Tilpas HubSpot, så pipeline, felter og ejerskab afspejler den faktiske salgsproces.",
      },
      {
        kode: "2.3",
        titel: "Indfør lead scoring",
        beskrivelse: "Giv leads point ud fra adfærd og profil, så sælgere bruger tid på de varmeste emner.",
      },
      {
        kode: "2.4",
        titel: "Automatisér rutineopgaver og opsæt rapportering, så pipeline kan følges og forudsiges",
        beskrivelse: "",
      },
    ],
    tjeklisteOverskrift: "Tjekliste (gate til Base 3)",
    tjekliste: [
      "Pipelinens faser er defineret og dokumenteret",
      "CRM afspejler den reelle salgsproces",
      "Lead scoring er sat op og i brug",
      "Rutineopgaver er automatiseret",
      "Faste rapporter findes for pipeline og salg",
    ],
    kpier: [
      {
        navn: "Konverteringsrate fra lead til kunde",
        beskrivelse: "Viser om salgsprocessen reelt lukker aftaler",
        kilde: "HubSpot",
      },
      {
        navn: "Gennemsnitlig tid i pipeline",
        beskrivelse: "Måler hvor hurtigt leads bevæger sig mod en aftale",
        kilde: "HubSpot",
      },
      {
        navn: "Andel leads uden opfølgning",
        beskrivelse: "Skal mod nul, så ingen kundeemner tabes",
        kilde: "HubSpot",
      },
    ],
    resultat: "En tydelig salgsproces, bedre kundeoverblik og en pipeline, der kan følges, måles og optimeres.",
    harMaaldato: true,
  },
  {
    nummer: 3,
    navn: "AI & Automation",
    overskrift: "Base 3 · AI & Automation",
    maal:
      "Bind marketing og salg sammen. Marketing, CRM og salg forbundet i ét samlet system, " +
      "så faserne holder op med at være adskilte og bliver til ét sammenhængende flow.",
    fokusomraader: [
      "AI-drevet lead capture",
      "Automatisk scoring og segmentering",
      "Personlige opfølgningsflows",
      "Automatisk handover til salg",
      "AI-baseret rapportering",
    ],
    steps: [
      {
        kode: "3.1",
        titel: "Sæt AI-drevet lead capture op",
        beskrivelse: "Lad nye leads opsamles automatisk fra kanalerne og lande direkte i CRM.",
      },
      { kode: "3.2", titel: "Automatisér scoring og segmentering, så leads altid er sorteret korrekt", beskrivelse: "" },
      {
        kode: "3.3",
        titel: "Byg personlige opfølgningsflows, der tilpasser sig leadets adfærd og segment",
        beskrivelse: "",
      },
      {
        kode: "3.4",
        titel: "Automatisér handover til salg og rapportering",
        beskrivelse: "Kvalificerede leads går automatisk til salg, og AI rapporterer på pipeline og omsætning.",
      },
    ],
    tjeklisteOverskrift: "Tjekliste (gate til Home)",
    tjekliste: [
      "Leads opsamles automatisk i CRM",
      "Scoring og segmentering kører uden manuelt arbejde",
      "Personlige opfølgningsflows er aktive",
      "Handover til salg sker automatisk",
      "AI-rapportering på pipeline er sat op",
    ],
    kpier: [
      {
        navn: "Andel leads håndteret automatisk",
        beskrivelse: "Viser hvor meget manuelt arbejde der er fjernet",
        kilde: "HubSpot",
      },
      {
        navn: "Svartid fra lead til første opfølgning",
        beskrivelse: "Måler hvor hurtigt systemet reagerer på nye emner",
        kilde: "HubSpot",
      },
      {
        navn: "Andel korrekt kvalificerede handovers",
        beskrivelse: "Viser om salg modtager de rigtige leads",
        kilde: "HubSpot / salgsfeedback",
      },
    ],
    resultat:
      "Leads bliver automatisk opsamlet, kvalificeret, fulgt op og sendt videre til salg uden unødigt manuelt arbejde.",
    harMaaldato: true,
  },
  {
    nummer: 4,
    navn: "Vedligehold",
    overskrift: "Home · Vedligehold",
    maal:
      "Hold vækstsystemet levende. Et system der løbende tilpasses data, læring og resultater. " +
      "Vedligehold er det, der gør modellen til et vækstsystem.",
    fokusomraader: ["Ejerskab", "Kadence", "Versionering", "Løbende optimering", "Performance review"],
    steps: [
      {
        kode: "4.1",
        titel: "Placér ejerskab",
        beskrivelse: "Udpeg hvem der har ansvar for systemet, så det ikke bliver ingen mands land.",
      },
      {
        kode: "4.2",
        titel: "Fastlæg en kadence",
        beskrivelse: "Aftal faste intervaller for gennemgang, så vedligehold sker rutinemæssigt.",
      },
      {
        kode: "4.3",
        titel: "Versionér ændringer",
        beskrivelse: "Dokumentér hvad der ændres og hvorfor, så læring bevares og kan rulles tilbage.",
      },
      {
        kode: "4.4",
        titel: "Hold performance review og optimér",
        beskrivelse: "Gennemgå resultater fast og justér systemet ud fra data.",
      },
    ],
    tjeklisteOverskrift: "Tjekliste",
    tjekliste: [
      "Ejerskab for systemet er placeret",
      "Fast kadence for gennemgang er aftalt",
      "Ændringer dokumenteres og versioneres",
      "Performance review afholdes løbende",
      "Optimeringer besluttes ud fra data",
    ],
    kpier: [
      {
        navn: "Antal optimeringer pr. periode",
        beskrivelse: "Viser om systemet reelt holdes levende",
        kilde: "Ændringslog",
      },
      {
        navn: "Udvikling i leads og omsætning over tid",
        beskrivelse: "Det samlede mål for, om vækstsystemet virker",
        kilde: "HubSpot",
      },
      {
        navn: "Andel reviews afholdt til tiden",
        beskrivelse: "Måler om kadencen faktisk overholdes",
        kilde: "Kalender / mødelog",
      },
    ],
    resultat: "Et levende vækstsystem, der løbende forbedres og bliver ved med at skabe værdi.",
    harMaaldato: false,
  },
];

// ------------------------------------------------------------------
// De fem base-specifikke tabeller i skabelonen
// ------------------------------------------------------------------

/** Base 1 · Valgte kanaler. Rækkerne er faste, værdierne udfyldes. */
export const MARKETINGKANALER: string[] = [
  "Paid Search",
  "Organic Search / SEO",
  "Paid Social",
  "Content Marketing",
  "Email Marketing",
];

/** Base 2 · Pipelinens faser. Fasenavnene er forslag og kan rettes. */
export const PIPELINE_FASER: { trin: number; fase: string }[] = [
  { trin: 1, fase: "Nyt lead" },
  { trin: 2, fase: "Kvalificeret" },
  { trin: 3, fase: "Møde booket" },
  { trin: 4, fase: "Tilbud sendt" },
  { trin: 5, fase: "Lukket vundet / tabt" },
];

/** Base 2 · Lead scoring. Tre tomme rækker med typen sat, som i skabelonen. */
export const LEAD_SCORING_TYPER = ["Adfærd", "Profil"] as const;
export const LEAD_SCORING_RAEKKER: { type: string }[] = [
  { type: "Adfærd" },
  { type: "Profil" },
  { type: "Adfærd" },
];

/** Base 3 · Automatiseringer. Tre tomme rækker, som i skabelonen. */
export const AUTOMATISERING_RAEKKER = 3;

/** Home · Ejerskab og kadence. Rækkerne er faste. */
export const EJERSKABSOMRAADER: string[] = [
  "Marketingkanaler og budget",
  "HubSpot og pipeline",
  "Automatiseringer og flows",
  "Rapportering og KPI'er",
];

/** Home · Ændringslog. Første version oprettes med systemet. */
export const FOERSTE_AENDRING = { version: "1.0", hvadBlevAendret: "Systemet sat i drift" };

/** Kundens udgangspunkt, sektion 0. Bruges som labels i formularen. */
export const UDGANGSPUNKT_FELTER: { noegle: string; label: string }[] = [
  { noegle: "aktiveKanaler", label: "Aktive marketingkanaler" },
  { noegle: "leadsPrMaaned", label: "Antal leads pr. måned i dag" },
  { noegle: "salgsproces", label: "Salgsproces i dag" },
  { noegle: "crmModenhed", label: "CRM-modenhed" },
  { noegle: "automatisering", label: "Automatisering i dag" },
  { noegle: "hvorTabes", label: "Hvor tabes leads og omsætning i dag" },
];

/** Fodnote nederst i skabelonen. */
export const SKABELON_FODNOTE = "The Thirdbase Model · Et vækstsystem, ikke en kampagne.";

/** Slår en base op i skabelonen ud fra nummer. */
export function skabelonBase(nummer: number): SkabelonBase | undefined {
  return BASER.find((b) => b.nummer === nummer);
}

/** Visningsnavn for en base, fx "Base 2" eller "Home". */
export function baseEtiket(nummer: number): string {
  return nummer === 4 ? "Home" : `Base ${nummer}`;
}
