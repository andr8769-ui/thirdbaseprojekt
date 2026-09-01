// DTO-typer som klienten arbejder på. Danske feltnavne, så portering fra
// prototypen er 1:1.

export type BrugerDTO = {
  id: string;
  navn: string;
  rolle: string;
  ini: string;
  f: string; // farve
  email: string;
  image?: string | null;
};

export type UnderopgaveDTO = { id: string; navn: string; faerdig: boolean };

// u = forfatterens id (null hvis forfatteren er slettet). navn = visningsnavn,
// levende hvis forfatteren findes, ellers historisk tekst ("Tidligere bruger").
export type KommentarDTO = { id: string; u: string | null; navn: string; tid: string; tekst: string };

export type FilDTO = {
  id: string;
  navn: string;
  type: string;
  meta: string;
  harData: boolean; // false = gammel attrap-række uden gemt fil
  uploaderId: string | null;
  bytes: number | null;
  pending?: boolean; // optimistisk upload i gang
  fejl?: string; // inline upload-fejl
};

export type LogDTO = { tekst: string; tid: string; farve: string };

export type OpgaveDTO = {
  id: string;
  navn: string;
  ansvarlige: string[];
  status: string;
  prioritet: string;
  start: string | null;
  slut: string | null;
  noter: string;
  creatorId: string | null;
  underopgaver: UnderopgaveDTO[];
  kommentarer: KommentarDTO[];
  filer: FilDTO[];
  log: LogDTO[];
};

export type GruppeDTO = { id: string; navn: string; farve: string; opgaver: OpgaveDTO[] };

export type BoardDTO = { id: string; navn: string; creatorId: string | null; grupper: GruppeDTO[] };

export type KundeDTO = {
  id: string;
  navn: string;
  kort: string;
  branche: string;
  farve: string;
  creatorId: string | null;
  boards: BoardDTO[];
};

export type NotiDTO = { id: string; tekst: string; tid: string; farve: string; read: boolean };

export type MigDTO = { id: string; navn: string; rolle: string; ini: string; f: string; email: string };

// Dashboard-kort pr. virksomhed (aggregeret server-side).
export type NaesteOpgaveDTO = { id: string; navn: string; slut: string | null; boardId: string };

export type DashboardKortDTO = {
  id: string;
  navn: string;
  kort: string;
  farve: string;
  boards: number;
  opgaver: number;
  faerdige: number;
  procent: number;
  overskredne: number;
  foersteBoardId: string | null;
  naeste: NaesteOpgaveDTO[];
};

export type AppData = {
  /** Dags dato ('YYYY-MM-DD', Europe/Copenhagen) beregnet server-side. */
  idag: string;
  brugere: BrugerDTO[];
  kunder: KundeDTO[];
  notifikationer: NotiDTO[];
  mig: MigDTO;
  dashboard: DashboardKortDTO[];
};
