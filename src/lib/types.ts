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

export type KommentarDTO = { id: string; u: string; tid: string; tekst: string };

export type FilDTO = { navn: string; type: string; meta: string };

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
  underopgaver: UnderopgaveDTO[];
  kommentarer: KommentarDTO[];
  filer: FilDTO[];
  log: LogDTO[];
};

export type GruppeDTO = { id: string; navn: string; farve: string; opgaver: OpgaveDTO[] };

export type BoardDTO = { id: string; navn: string; grupper: GruppeDTO[] };

export type KundeDTO = { id: string; navn: string; kort: string; branche: string; boards: BoardDTO[] };

export type NotiDTO = { id: string; tekst: string; tid: string; farve: string; read: boolean };

export type MigDTO = { id: string; navn: string; rolle: string; ini: string; f: string; email: string };

export type AppData = {
  brugere: BrugerDTO[];
  kunder: KundeDTO[];
  notifikationer: NotiDTO[];
  mig: MigDTO;
};
