# thirdbase · Projektstyring

Internt projektstyringsværktøj for thirdbase — **alle kunder, ét overblik**.
Boards, opgaver, deadlines, kommentarer og dashboards for hver kunde, samlet ét sted.

Bygget som en rigtig, kørende webapp ud fra prototypen fra Claude Design (ligger som
reference i `prototype/`). Al funktionalitet og alt design er 1:1 med prototypen.

---

## Stack

| Lag | Teknologi |
| --- | --- |
| Framework | **Next.js 15** (App Router) + **TypeScript** |
| Styling | **Tailwind CSS** + design-system-tokens + **Instrument Sans** (via `next/font`) |
| Auth | **Auth.js / NextAuth v5** med Google-provider, låst til `@thirdbase.dk` |
| Database | **PostgreSQL** via **Prisma** |
| Hosting | **Vercel** (ingen custom server) |

Alle handlinger (statusskifte, flyt af opgaver, kommentarer, nye kunder/boards m.m.)
persisteres i databasen via **server actions** — intet gemmes i `localStorage`.

---

## Funktioner

- **Mit arbejde** — dine åbne opgaver grupperet i Forsinket / I dag / Denne uge / Senere.
- **Overblik · alle kunder** — KPI’er, arbejdsbelastning pr. teammedlem, åbne opgaver pr. kunde.
- **Kunde-dashboards** — statusfordeling (donut), opgaver pr. teammedlem (søjler), kommende deadlines.
- **Boards** i tre visninger: **Tabel**, **Kanban** og **Tidslinje (Gantt)**.
- **Opgavepanel** med status, prioritet, ansvarlige, noter, underopgaver, filer,
  **kommentarer med @mentions** og aktivitetslog.
- **Ét-klik statusskifte**, **træk rækker mellem grupper** (tabel) og **træk kort mellem statuskolonner** (kanban).
- **Søgning**, **notifikationer**, **filtre** (person/status/prioritet) og oprettelse af **kunder** og **boards**.

> Datoberegninger (deadlines, buckets, tidslinje) tager udgangspunkt i en fast “i dag”
> (2026-08-03), så seed-dataen matcher prototypen 1:1.

---

## Login — kun @thirdbase.dk

Login sker udelukkende med **Google**. Adgangen er låst til thirdbase på to niveauer:

1. `hd=thirdbase.dk` sendes med til Google, så kontovælgeren kun viser thirdbase-konti.
2. **Server-side** i `signIn`-callbacket (`src/auth.ts`) valideres det, at
   `email_verified === true` **og** at mailen slutter på `@thirdbase.dk`. Alt andet
   afvises og sender brugeren til en pæn fejlside (`/login`).

Første gang en thirdbase-bruger logger ind, oprettes brugeren automatisk med navn,
billede, initialer og rollen **“Medarbejder”**. Alle sider er beskyttet af `middleware.ts`.

---

## Lokal opsætning

```bash
# 1) Installér afhængigheder (kører automatisk `prisma generate`)
npm install

# 2) Kopiér miljøvariabler og udfyld dem
cp .env.example .env

# 3) Opret skemaet i din database og læg mockdata ind
npx prisma migrate deploy      # eller: npx prisma db push
npm run db:seed

# 4) Start udviklingsserveren
npm run dev
# → http://localhost:3000
```

### Miljøvariabler (`.env`)

| Variabel | Beskrivelse |
| --- | --- |
| `GOOGLE_CLIENT_ID` | OAuth Client ID fra Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret |
| `AUTH_SECRET` | Hemmelighed til NextAuth (`npx auth secret` eller `openssl rand -base64 32`) |
| `AUTH_URL` | Appens canoniske URL (lokalt `http://localhost:3000`) |
| `DATABASE_URL` | **Pooled** Postgres-forbindelse — bruges af appen i runtime |
| `DATABASE_URL_UNPOOLED` | **Direct** Postgres-forbindelse — bruges af Prisma til migrationer (`directUrl`). Neon leverer begge; lokalt kan den være = `DATABASE_URL` |

Ingen hemmeligheder ligger i repoet — `.env` er git-ignoreret. Se `.env.example`.

---

## Google Cloud Console — opsætning

Opret et OAuth 2.0 **Client ID** (type: *Web application*) under
**APIs & Services → Credentials**, og indsæt følgende:

**Authorized JavaScript origins**
```
http://localhost:3000
https://projekt.thirdbase.dk
```

**Authorized redirect URIs** (NextAuth’s callback-sti er `/api/auth/callback/google`)
```
http://localhost:3000/api/auth/callback/google
https://projekt.thirdbase.dk/api/auth/callback/google
```

Tips:
- Tilføj en redirect-URI pr. miljø, du deployer (fx Vercel preview-URLs, hvis I bruger dem).
- På OAuth-samtykkeskærmen kan I vælge **Internal**, hvis thirdbase bruger Google Workspace —
  så kan kun brugere i organisationen logge ind. Domænelåsen håndhæves under alle
  omstændigheder også server-side i appen.

---

## Deploy på Vercel

1. **Importér repoet** i Vercel (Framework preset: *Next.js*). Ingen custom server nødvendig.
2. Opret en **Postgres-database** (Vercel Postgres, Neon eller Supabase) og kopiér
   connection string’en.
3. Sæt **Environment Variables** i Vercel-projektet (Production + Preview):

   | Variabel | Værdi |
   | --- | --- |
   | `GOOGLE_CLIENT_ID` | fra Google Cloud Console |
   | `GOOGLE_CLIENT_SECRET` | fra Google Cloud Console |
   | `AUTH_SECRET` | genereret hemmelighed |
   | `AUTH_URL` | `https://projekt.thirdbase.dk` (jeres produktions-URL) |
   | `DATABASE_URL` | pooled Postgres connection string |
   | `DATABASE_URL_UNPOOLED` | direct Postgres connection string (til migrationer) |

4. **Build**: `npm run build` kører `prisma generate && node prisma/deploy.mjs && next build`.
   - `prisma generate` kører også i `postinstall`.
   - `prisma/deploy.mjs` kører **`prisma migrate deploy`** (mod den direkte forbindelse) og
     seeder derefter **kun hvis databasen er tom** — så prototypens demodata kommer ind
     én gang uden nogensinde at overskrive senere data.
   - Mangler `DATABASE_URL` (fx et rent lokalt build), springes migrate + seed over, og
     buildet lykkes stadig. Selve `next build` kræver ingen DB — alle sider er `force-dynamic`.

   Migration (og første seed) sker altså **automatisk ved hvert Vercel-build** — ingen
   manuelle skridt mod produktionsdatabasen.

5. **Subdomæne**: peg `projekt.thirdbase.dk` mod Vercel-projektet under
   **Settings → Domains**. Appen kører på sit eget Vercel-projekt, egen database og egen
   frontend/backend — helt adskilt fra thirdbase.dk-hovedsitet.

---

## Projektstruktur

```
prisma/
  schema.prisma            # User, Customer, Board, Group, Task, Subtask,
                           # Comment (mentions), Notification (+ Activity, Attachment)
  seed.ts                  # Lægger prototypens mockdata ind 1:1
  migrations/0_init/       # Initiel migration
src/
  auth.ts                  # NextAuth v5: domænelås + auto-oprettelse af bruger
  auth.config.ts           # Edge-sikker config (bruges af middleware)
  middleware.ts            # Alle sider bag login
  lib/
    prisma.ts              # PrismaClient-singleton
    constants.ts           # STATUS, PRIO, tokens og hjælpere (porteret fra prototypen)
    data.ts                # Loader hele datatræet til klienten
    types.ts               # DTO-typer
  app/
    layout.tsx             # Instrument Sans + globals
    globals.css            # Design-system-tokens
    login/page.tsx         # Google-login + pæn fejlside
    page.tsx               # Beskyttet forside → App
    actions.ts             # Server actions (alle mutationer)
    api/auth/[...nextauth]/route.ts
  components/
    App.tsx                # Hele UI’et, 1:1 med prototypen
prototype/                 # Reference: den oprindelige Claude Design-prototype
```

---

## Scripts

| Kommando | Handling |
| --- | --- |
| `npm run dev` | Udviklingsserver |
| `npm run build` | `prisma generate` + produktions-build |
| `npm start` | Kør produktions-build |
| `npm run db:seed` | Seed databasen med mockdata |
| `npx prisma migrate deploy` | Anvend migrationer |
