/* eslint-disable @typescript-eslint/no-explicit-any */
// ------------------------------------------------------------------
// Seed — lægger prototypens mockdata ind i databasen 1:1.
// Kør:  npm run db:seed   (efter  prisma db push / migrate)
// ------------------------------------------------------------------
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STATUS = [
  { navn: "Ikke startet", f: "#C4C7CE" },
  { navn: "I gang", f: "#3355FF" },
  { navn: "Afventer kunde", f: "#FFB020" },
  { navn: "Klar til review", f: "#7B61FF" },
  { navn: "Færdig", f: "#16A34A" },
];
const PRIO = [
  { navn: "Kritisk", f: "#FF442B" },
  { navn: "Høj", f: "#FF8A65" },
  { navn: "Medium", f: "#3355FF" },
  { navn: "Lav", f: "#9E9E9E" },
];

// Ingen demo-/mockdata-brugere længere. De rigtige brugere oprettes via Google-login
// (eller admin på /brugere). Kunder, boards og opgaver seedes stadig som demodata,
// men uden ansvarlige, kommentarer og notifikationer — dem kan der ikke være uden
// rigtige brugere. 'key' bevares i opgavedataen, men resolver bare til ingenting.
const BRUGERE: { key: string; navn: string; rolle: string; ini: string; f: string; email: string }[] = [];

function T(navn: string, a: string[], s: number, p: number, start: string, slut: string, noter: string, subs?: string[]) {
  return { navn, a, s, p, start, slut, noter, subs: subs || [] };
}

const KUNDER = [
  {
    navn: "Nordvest Bilcenter A/S", kort: "NB", branche: "Bilforhandler · Aalborg",
    boards: [
      { navn: "Leadgenerering", grupper: [
        { navn: "Denne uge", farve: "#FF442B", opgaver: [
          T("Opsæt leadscoring-model for prøvekørsler", ["u1", "u4"], 1, 0, "2026-07-27", "2026-08-07", "Data trækkes ugentligt fra deres DMS. Afventer feltmapping fra Christian.", ["Definér scoringskriterier", "Mapping af felter fra DMS", "Validering med salgschef"]),
          T("Ny landingsside til varevogne", ["u2"], 2, 1, "2026-07-30", "2026-08-05", "Kunden skal godkende billedmateriale før publicering.", ["Wireframe", "Tekst til hero", "Opsæt formular"]),
          T("Gennemgå juli-leads med sælgerteamet", ["u1"], 3, 2, "2026-08-03", "2026-08-03", "Møde kl. 13 hos kunden i Aalborg.", []),
          T("Justér budgivning på Google Ads brugtbil", ["u2"], 1, 1, "2026-08-03", "2026-08-06", "CPA er steget 18% siden uge 29.", []),
        ] },
        { navn: "Backlog", farve: "#9E9E9E", opgaver: [
          T("Formular-tracking på testkørsel", ["u2"], 0, 2, "2026-08-10", "2026-08-14", "Kræver adgang til GTM-container.", []),
          T("Integration mellem CRM og Bilinfo", ["u4"], 0, 1, "2026-08-17", "2026-08-28", "Estimat 6.000 DKK i udvikling.", ["Teknisk afklaring", "Test i sandbox"]),
          T("Leadmagnet: guide til erhvervsleasing", ["u3"], 0, 3, "2026-08-24", "2026-09-04", "", []),
        ] },
        { navn: "Afsluttet", farve: "#16A34A", opgaver: [
          T("Kortlægning af leadflow", ["u1", "u4"], 4, 2, "2026-07-06", "2026-07-17", "Leveret som workshop-materiale.", []),
          T("Opsætning af conversion tracking", ["u2"], 4, 1, "2026-07-13", "2026-07-24", "", []),
        ] },
      ] },
      { navn: "Content og LinkedIn", grupper: [
        { navn: "Denne uge", farve: "#FF442B", opgaver: [
          T("Redigér 3 videoklip fra værkstedet", ["u3"], 1, 1, "2026-07-31", "2026-08-04", "Råklip ligger i delt drev.", ["Klip", "Undertekster på dansk"]),
          T("Kalender for august godkendes af kunden", ["u3", "u1"], 2, 2, "2026-07-29", "2026-08-03", "Sendt til Louise mandag.", []),
          T("LinkedIn-opslag: elbil-serviceaftale", ["u3"], 0, 2, "2026-08-04", "2026-08-07", "", []),
        ] },
        { navn: "Backlog", farve: "#9E9E9E", opgaver: [
          T("Medarbejderportrætter til Q4", ["u3"], 0, 3, "2026-09-01", "2026-09-18", "Fotograf skal bookes.", []),
          T("Opdatér tone of voice-guide", ["u3"], 0, 3, "2026-08-20", "2026-08-27", "", []),
        ] },
        { navn: "Afsluttet", farve: "#16A34A", opgaver: [
          T("Content-audit af eksisterende opslag", ["u3"], 4, 2, "2026-07-01", "2026-07-10", "", []),
        ] },
      ] },
      { navn: "Kampagner", grupper: [
        { navn: "Denne uge", farve: "#FF442B", opgaver: [
          T("Kampagne: Sensommer-salg på brugte SUV", ["u2", "u1"], 1, 0, "2026-07-28", "2026-08-11", "Budget 42.000 DKK fordelt på Meta og Google.", ["Annoncetekster", "Billedformater 1:1 og 9:16", "Opsæt målgrupper"]),
          T("Rapport for juli sendes til kunden", ["u1"], 3, 1, "2026-08-01", "2026-08-03", "Skal indeholde CPL pr. kanal.", []),
        ] },
        { navn: "Backlog", farve: "#9E9E9E", opgaver: [
          T("Test af nye annonceformater på Meta", ["u2"], 0, 2, "2026-08-12", "2026-08-21", "", []),
          T("Retargeting på besøgende i bilkonfigurator", ["u2"], 0, 1, "2026-08-18", "2026-08-31", "", []),
        ] },
        { navn: "Afsluttet", farve: "#16A34A", opgaver: [
          T("Forårskampagne · afrapportering", ["u2", "u1"], 4, 2, "2026-06-15", "2026-07-03", "", []),
        ] },
      ] },
    ],
  },
  {
    navn: "Bregnholt Industri A/S", kort: "BI", branche: "Produktion · Vejle",
    boards: [
      { navn: "Leadgenerering", grupper: [
        { navn: "Denne uge", farve: "#FF442B", opgaver: [
          T("Segmentering af emnelister til underleverandører", ["u4", "u1"], 1, 1, "2026-07-29", "2026-08-06", "Datagrundlag fra Bisnode.", ["Rens dubletter", "Berig med branchekoder"]),
          T("Opsæt scoring på webinar-tilmeldinger", ["u4"], 2, 2, "2026-07-27", "2026-08-04", "Afventer svar fra deres IT.", []),
          T("Outbound-sekvens til indkøbschefer", ["u3"], 1, 1, "2026-08-03", "2026-08-10", "5 mails over 3 uger.", ["Mail 1-2", "Mail 3-5"]),
        ] },
        { navn: "Backlog", farve: "#9E9E9E", opgaver: [
          T("Case-interview med produktionschef", ["u3"], 0, 2, "2026-08-19", "2026-08-26", "", []),
          T("Leadscoring version 2 med vægtning på omsætning", ["u4"], 0, 3, "2026-09-02", "2026-09-16", "", []),
        ] },
        { navn: "Afsluttet", farve: "#16A34A", opgaver: [
          T("Workshop om ICP og købsrejse", ["u1"], 4, 1, "2026-06-22", "2026-07-02", "", []),
        ] },
      ] },
      { navn: "Onboarding", grupper: [
        { navn: "Denne uge", farve: "#FF442B", opgaver: [
          T("Adgange til Google Ads og Meta Business", ["u2"], 2, 0, "2026-07-24", "2026-07-31", "Rykket to gange. Kontakt Henrik direkte.", []),
          T("Kickoff-møde med marketing og salg", ["u1", "u3"], 4, 1, "2026-07-20", "2026-07-28", "", []),
          T("Opsæt delt rapporteringsdashboard", ["u4"], 1, 2, "2026-08-03", "2026-08-07", "", ["Datakilder", "Skabelon"]),
        ] },
        { navn: "Backlog", farve: "#9E9E9E", opgaver: [
          T("Aftale om månedlig statusrytme", ["u1"], 0, 3, "2026-08-14", "2026-08-18", "", []),
        ] },
        { navn: "Afsluttet", farve: "#16A34A", opgaver: [
          T("Kontrakt og databehandleraftale", ["u1"], 4, 0, "2026-07-06", "2026-07-13", "", []),
        ] },
      ] },
    ],
  },
  {
    navn: "Sylvest Logistik A/S", kort: "SY", branche: "Logistik · Taastrup",
    boards: [
      { navn: "Kampagner", grupper: [
        { navn: "Denne uge", farve: "#FF442B", opgaver: [
          T("LinkedIn-kampagne mod e-commerce-kunder", ["u2", "u3"], 1, 0, "2026-07-30", "2026-08-12", "Målgruppe: logistikansvarlige i webshops over 50 mio. DKK.", ["Annoncetekster", "Målgruppeopsætning", "Landingsside"]),
          T("Opdatér budget efter Q3-justering", ["u1"], 3, 1, "2026-08-02", "2026-08-04", "Ny ramme på 78.000 DKK pr. kvartal.", []),
          T("A/B-test af annoncebilleder", ["u2"], 0, 2, "2026-08-05", "2026-08-13", "", []),
        ] },
        { navn: "Backlog", farve: "#9E9E9E", opgaver: [
          T("Kampagne til returlogistik i Q4", ["u2"], 0, 2, "2026-09-07", "2026-09-30", "", []),
          T("Undersøg annoncering i brancheportaler", ["u1"], 0, 3, "2026-08-24", "2026-09-04", "", []),
        ] },
        { navn: "Afsluttet", farve: "#16A34A", opgaver: [
          T("Sommerkampagne · afrapportering", ["u2"], 4, 2, "2026-06-08", "2026-06-30", "", []),
        ] },
      ] },
      { navn: "Content og LinkedIn", grupper: [
        { navn: "Denne uge", farve: "#FF442B", opgaver: [
          T("Artikel: Sådan reducerer du fejlleveringer", ["u3"], 2, 1, "2026-07-27", "2026-08-05", "Fagligt review hos deres driftschef.", []),
          T("Ugentlige opslag uge 32-34", ["u3"], 1, 2, "2026-08-03", "2026-08-21", "", ["Uge 32", "Uge 33", "Uge 34"]),
        ] },
        { navn: "Backlog", farve: "#9E9E9E", opgaver: [
          T("Videoserie fra terminalen i Taastrup", ["u3", "u2"], 0, 2, "2026-09-01", "2026-09-25", "Kræver sikkerhedsgodkendelse.", []),
        ] },
        { navn: "Afsluttet", farve: "#16A34A", opgaver: [
          T("Profiloptimering af ledelsen på LinkedIn", ["u3"], 4, 3, "2026-06-29", "2026-07-09", "", []),
        ] },
      ] },
    ],
  },
];

// Attrap-filer pr. opgave (uden gemte bytes). Ingen personnavne i metateksten —
// uploaderen er ukendt indtil en rigtig bruger lægger en fil op i appen.
const FILER = [
  [{ navn: "leadscoring-model-v3.xlsx", type: "XLSX", meta: "1,4 MB" }, { navn: "feltmapping-dms.pdf", type: "PDF", meta: "320 KB" }],
  [{ navn: "annoncetekster-august.docx", type: "DOCX", meta: "88 KB" }],
  [{ navn: "rapport-juli.pdf", type: "PDF", meta: "2,1 MB" }],
];

// Pæne default-farver pr. virksomhed (styrer dashboard-kortenes accent).
const KUNDE_FARVER = ["#FF442B", "#3355FF", "#7B61FF"];

async function main() {
  // Idempotent: seed kun hvis databasen er tom, så senere data aldrig overskrives.
  const findes = await prisma.customer.count();
  if (findes > 0) {
    console.log(`Databasen har allerede ${findes} kunder — springer seed over.`);
    return;
  }

  console.log("Opretter brugere …");
  const userIdByKey = new Map<string, string>();
  const userIdByName = new Map<string, string>();
  for (const b of BRUGERE) {
    // upsert på den unikke email — genkører uden at duplikere team-brugerne.
    const u = await prisma.user.upsert({
      where: { email: b.email },
      update: { name: b.navn, initials: b.ini, color: b.f, role: b.rolle },
      create: { email: b.email, name: b.navn, initials: b.ini, color: b.f, role: b.rolle },
    });
    userIdByKey.set(b.key, u.id);
    userIdByName.set(b.navn, u.id);
  }

  const base = new Date("2026-08-01T09:00:00Z").getTime();
  const ejerId = userIdByName.get("Mette Kragh") || null;
  let tid = 0;

  console.log("Opretter kunder, boards, grupper og opgaver …");
  for (let ki = 0; ki < KUNDER.length; ki++) {
    const k = KUNDER[ki];
    const customer = await prisma.customer.create({
      data: {
        name: k.navn,
        short: k.kort,
        industry: k.branche,
        color: KUNDE_FARVER[ki % KUNDE_FARVER.length],
        position: ki,
        creatorId: ejerId,
      },
    });

    for (let bi = 0; bi < k.boards.length; bi++) {
      const b = k.boards[bi];
      const board = await prisma.board.create({
        data: { name: b.navn, position: bi, customerId: customer.id, creatorId: ejerId },
      });

      for (let gi = 0; gi < b.grupper.length; gi++) {
        const g = b.grupper[gi];
        const group = await prisma.group.create({
          data: { name: g.navn, color: g.farve, position: gi, boardId: board.id },
        });

        for (let oi = 0; oi < g.opgaver.length; oi++) {
          const o = g.opgaver[oi];
          tid++;

          // Uden seed-brugere resolver alle keys til ingenting → opgaven er uassigneret.
          const assigneeIds = o.a.map((key) => userIdByKey.get(key)!).filter(Boolean);
          const filSet = tid % 3 === 0 ? FILER[tid % 3] : tid % 4 === 0 ? FILER[1] : [];

          const task = await prisma.task.create({
            data: {
              name: o.navn,
              status: STATUS[o.s].navn,
              priority: PRIO[o.p].navn,
              startDate: o.start,
              endDate: o.slut,
              notes: o.noter,
              position: oi,
              groupId: group.id,
              creatorId: ejerId,
              assignees: { connect: assigneeIds.map((id) => ({ id })) },
              subtasks: {
                create: o.subs.map((s, si) => ({ name: s, done: si === 0 && o.s > 1, position: si })),
              },
              files: { create: filSet.map((f) => ({ name: f.navn, type: f.type, meta: f.meta })) },
            },
          });

          // Ingen seed-kommentarer — de kræver rigtige forfattere.

          // Aktivitetslog — nyeste øverst (created øverst som i prototypen).
          // Neutral tekst uden personnavne (ingen actor på seedet demodata).
          const logEntries = [
            { text: "Opgave oprettet", displayTime: "14. jul. kl. 10.02", color: "#C4C7CE" },
            { text: "Status ændret til " + STATUS[o.s].navn, displayTime: "29. jul. kl. 15.48", color: STATUS[o.s].f },
            { text: "Deadline sat til " + o.slut, displayTime: "30. jul. kl. 09.11", color: "#3355FF" },
          ];
          for (let li = 0; li < logEntries.length; li++) {
            const e = logEntries[li];
            await prisma.activity.create({
              data: {
                text: e.text,
                color: e.color,
                displayTime: e.displayTime,
                taskId: task.id,
                actorId: null,
                // Bevar visningsrækkefølgen (created øverst) ved desc-sortering.
                createdAt: new Date(base - li * 60000),
              },
            });
          }
        }
      }
    }
  }

  // Ingen seed-notifikationer — de kræver rigtige modtagere.

  const antal = await prisma.task.count();
  console.log(`Færdig. ${antal} opgaver oprettet.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
