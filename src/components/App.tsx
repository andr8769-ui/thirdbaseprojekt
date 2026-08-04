"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AppData, OpgaveDTO, GruppeDTO, BoardDTO, KundeDTO, DashboardKortDTO, FilDTO } from "@/lib/types";
import {
  STATUS,
  PRIO,
  AV,
  PRIK,
  sx,
  dtoTekst,
  dage,
  deadlineFarve,
  statusOf,
  prioOf,
  erAdmin,
  KUNDE_FARVER,
  IDAG,
  readableSize,
  filTilladt,
  filTypeLabel,
  MAX_FIL_BYTES,
  MAX_TASK_BYTES,
} from "@/lib/constants";
import {
  setStatus,
  setPriority,
  moveTask,
  addTask,
  toggleSubtask,
  addComment,
  createCustomer,
  createBoard,
  setCustomerColor,
  markNotificationsRead,
  assignUser,
  unassignUser,
  uploadAttachment,
  deleteAttachment,
  deleteTask,
  deleteBoard,
  deleteCustomer,
  logout,
} from "@/app/actions";

type Nav =
  | { type: "forside" }
  | { type: "mit" }
  | { type: "overblik" }
  | { type: "dashboard"; kundeId: string }
  | { type: "board"; kundeId: string; boardId: string };

type SletMaal =
  | { type: "opgave"; id: string; navn: string }
  | { type: "board"; id: string; navn: string; kundeId: string }
  | { type: "kunde"; id: string; navn: string }
  | { type: "fil"; id: string; navn: string; taskId: string };

type Flat = { o: OpgaveDTO; g: GruppeDTO; b: BoardDTO; k: KundeDTO };

export default function App({ data: initialData, initialTaskId }: { data: AppData; initialTaskId?: string | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Lokal kopi af datatræet → optimistiske opdateringer rammer skærmen med det samme.
  // Resynkroniseres når serveren sender friske props (navigation / router.refresh på fejl).
  const [data, setData] = useState<AppData>(initialData);
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Deep-link fra e-mail: åbn direkte på en opgave.
  const deepLink = (() => {
    if (!initialTaskId) return null;
    for (const k of initialData.kunder)
      for (const b of k.boards)
        for (const g of b.grupper)
          for (const o of g.opgaver)
            if (o.id === initialTaskId) return { kundeId: k.id, boardId: b.id, taskId: o.id };
    return null;
  })();

  const [nav, setNav] = useState<Nav>(
    deepLink ? { type: "board", kundeId: deepLink.kundeId, boardId: deepLink.boardId } : { type: "forside" },
  );
  const [visning, setVisning] = useState<"tabel" | "kanban" | "gantt">("tabel");
  const [aabneKunder, setAabneKunder] = useState<Record<string, boolean>>(
    deepLink ? { [deepLink.kundeId]: true } : data.kunder[0] ? { [data.kunder[0].id]: true } : {},
  );
  const [panelId, setPanelId] = useState<string | null>(deepLink ? deepLink.taskId : null);
  const [sletMaal, setSletMaal] = useState<SletMaal | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [visAnsvarligMenu, setVisAnsvarligMenu] = useState(false);
  const [filDragOver, setFilDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusMenu, setStatusMenu] = useState<string | null>(null);
  const [prioMenu, setPrioMenu] = useState<string | null>(null);
  const [visNoti, setVisNoti] = useState(false);
  const [soeg, setSoeg] = useState("");
  const [filter, setFilter] = useState<{ person: string; status: string; prio: string }>({
    person: "",
    status: "",
    prio: "",
  });
  const [nyOpgave, setNyOpgave] = useState<Record<string, string>>({});
  const [kommentarUdkast, setKommentarUdkast] = useState("");
  const [modal, setModal] = useState<{ type: "kunde" } | { type: "board"; kundeId: string } | null>(null);
  const [modalVaerdi, setModalVaerdi] = useState("");
  const [modalFarve, setModalFarve] = useState<string>(KUNDE_FARVER[0]);
  const [udfoldet, setUdfoldet] = useState<Record<string, boolean>>({});
  const [foldet, setFoldet] = useState<Record<string, boolean>>({});

  const dragRef = useRef<string | null>(null);
  const mig = data.mig;

  // ---- data-hjælpere ----
  const bruger = (id: string) => data.brugere.find((b) => b.id === id) || data.brugere[0] || mig;
  const kunde = (id: string) => data.kunder.find((k) => k.id === id) || null;
  const board = (kid: string, bid: string) => kunde(kid)?.boards.find((b) => b.id === bid) || null;

  const alleOpgaver = (): Flat[] => {
    const ud: Flat[] = [];
    data.kunder.forEach((k) =>
      k.boards.forEach((b) => b.grupper.forEach((g) => g.opgaver.forEach((o) => ud.push({ o, g, b, k })))),
    );
    return ud;
  };
  const findOpgave = (id: string) => alleOpgaver().find((x) => x.o.id === id);
  const passerFilter = (o: OpgaveDTO) => {
    if (filter.person && o.ansvarlige.indexOf(filter.person) < 0) return false;
    if (filter.status && o.status !== filter.status) return false;
    if (filter.prio && o.prioritet !== filter.prio) return false;
    return true;
  };

  // Kør en action i baggrunden (til logud o.l.).
  const act = (fn: () => Promise<unknown>) => startTransition(async () => { await fn(); });

  // ---- optimistisk mutation ----
  // Opdatér skærmen straks (transform), kør server action i baggrunden. Fejler den,
  // vises en fejlbesked og skærmen resynkroniseres fra serveren (router.refresh →
  // useEffect på initialData ruller den optimistiske ændring tilbage til sandheden).
  function mutate(transform: (d: AppData) => AppData, action: () => Promise<unknown>, fejl = "Ændringen kunne ikke gemmes") {
    setData((d) => transform(d));
    startTransition(async () => {
      try {
        const res = (await action()) as { ok?: boolean; reason?: string } | undefined;
        if (res && typeof res === "object" && "ok" in res && res.ok === false) {
          visToast(res.reason || fejl);
          router.refresh();
        }
      } catch {
        visToast(fejl + " – prøver igen.");
        router.refresh();
      }
    });
  }

  const plusDage = (d: string, n: number) => new Date(new Date(d).getTime() + n * 86400000).toISOString().slice(0, 10);
  const tmpId = () => "tmp-" + Math.random().toString(36).slice(2, 10);

  const patchTask = (d: AppData, taskId: string, patch: Partial<OpgaveDTO>): AppData => ({
    ...d,
    kunder: d.kunder.map((k) => ({
      ...k,
      boards: k.boards.map((b) => ({
        ...b,
        grupper: b.grupper.map((g) => ({ ...g, opgaver: g.opgaver.map((o) => (o.id === taskId ? { ...o, ...patch } : o)) })),
      })),
    })),
  });
  const findTaskIn = (d: AppData, taskId: string): OpgaveDTO | undefined => {
    for (const k of d.kunder) for (const b of k.boards) for (const g of b.grupper) for (const o of g.opgaver) if (o.id === taskId) return o;
    return undefined;
  };
  const mapGruppe = (d: AppData, groupId: string, fn: (g: GruppeDTO) => GruppeDTO): AppData => ({
    ...d,
    kunder: d.kunder.map((k) => ({
      ...k,
      boards: k.boards.map((b) => ({ ...b, grupper: b.grupper.map((g) => (g.id === groupId ? fn(g) : g)) })),
    })),
  });

  // ---- optimistiske handlers ----
  const doSetStatus = (taskId: string, status: string) =>
    mutate((d) => patchTask(d, taskId, { status }), () => setStatus(taskId, status));
  const doSetPriority = (taskId: string, prioritet: string) =>
    mutate((d) => patchTask(d, taskId, { prioritet }), () => setPriority(taskId, prioritet));
  const doToggleSubtask = (taskId: string, subId: string) =>
    mutate(
      (d) => patchTask(d, taskId, { underopgaver: (findTaskIn(d, taskId)?.underopgaver || []).map((u) => (u.id === subId ? { ...u, faerdig: !u.faerdig } : u)) }),
      () => toggleSubtask(subId),
    );
  const doAssign = (taskId: string, userId: string) =>
    mutate(
      (d) => patchTask(d, taskId, { ansvarlige: Array.from(new Set([...(findTaskIn(d, taskId)?.ansvarlige || []), userId])) }),
      () => assignUser(taskId, userId),
    );
  const doUnassign = (taskId: string, userId: string) =>
    mutate(
      (d) => patchTask(d, taskId, { ansvarlige: (findTaskIn(d, taskId)?.ansvarlige || []).filter((id) => id !== userId) }),
      () => unassignUser(taskId, userId),
    );
  const doSetCustomerColor = (kundeId: string, farve: string) =>
    mutate(
      (d) => ({
        ...d,
        kunder: d.kunder.map((k) => (k.id === kundeId ? { ...k, farve } : k)),
        dashboard: d.dashboard.map((c) => (c.id === kundeId ? { ...c, farve } : c)),
      }),
      () => setCustomerColor(kundeId, farve),
    );
  const doAddComment = (taskId: string, tekst: string) => {
    const temp = { id: tmpId(), u: mig.id, tid: "lige nu", tekst };
    mutate((d) => patchTask(d, taskId, { kommentarer: [...(findTaskIn(d, taskId)?.kommentarer || []), temp] }), () => addComment(taskId, tekst));
  };
  const doAddTask = (groupId: string, navn: string) => {
    const temp = tmpId();
    const nyOpg: OpgaveDTO = {
      id: temp, navn, ansvarlige: [mig.id], status: "Ikke startet", prioritet: "Medium",
      start: IDAG, slut: plusDage(IDAG, 7), noter: "", creatorId: mig.id,
      underopgaver: [], kommentarer: [], filer: [], log: [],
    };
    setData((d) => mapGruppe(d, groupId, (g) => ({ ...g, opgaver: [...g.opgaver, nyOpg] })));
    startTransition(async () => {
      try {
        const res = (await addTask(groupId, navn)) as { id?: string } | undefined;
        if (res?.id) setData((d) => patchTask(d, temp, { id: res.id! }));
      } catch {
        setData((d) => mapGruppe(d, groupId, (g) => ({ ...g, opgaver: g.opgaver.filter((o) => o.id !== temp) })));
        visToast("Opgaven kunne ikke oprettes.");
      }
    });
  };
  const doMoveTask = (taskId: string, targetGroupId: string, beforeId: string | null) =>
    mutate(
      (d) => {
        const o = findTaskIn(d, taskId);
        if (!o) return d;
        const uden: AppData = {
          ...d,
          kunder: d.kunder.map((k) => ({
            ...k,
            boards: k.boards.map((b) => ({ ...b, grupper: b.grupper.map((g) => ({ ...g, opgaver: g.opgaver.filter((x) => x.id !== taskId) })) })),
          })),
        };
        return mapGruppe(uden, targetGroupId, (g) => {
          const idx = beforeId ? g.opgaver.findIndex((x) => x.id === beforeId) : -1;
          const arr = g.opgaver.slice();
          if (idx >= 0) arr.splice(idx, 0, o);
          else arr.push(o);
          return { ...g, opgaver: arr };
        });
      },
      () => moveTask(taskId, targetGroupId, beforeId),
    );
  const doMarkNotisRead = () => {
    if (data.notifikationer.every((n) => n.read)) return;
    setData((d) => ({ ...d, notifikationer: d.notifikationer.map((n) => ({ ...n, read: true })) }));
    act(() => markNotificationsRead());
  };

  // ---- filer ----
  const filerAf = (taskId: string): FilDTO[] => findTaskIn(data, taskId)?.filer || [];
  const kanSletteFil = (f: FilDTO) => erAdmin(mig.rolle) || (!!f.uploaderId && f.uploaderId === mig.id);
  const patchFiler = (d: AppData, taskId: string, fn: (filer: FilDTO[]) => FilDTO[]): AppData =>
    patchTask(d, taskId, { filer: fn(findTaskIn(d, taskId)?.filer || []) });

  const doUploadFiler = (taskId: string, list: FileList) => {
    let brugt = filerAf(taskId).reduce((s, f) => s + (f.bytes || 0), 0);
    for (const file of Array.from(list)) {
      const temp = tmpId();
      let fejl: string | null = null;
      if (file.size === 0) fejl = "Filen er tom.";
      else if (file.size > MAX_FIL_BYTES) fejl = `Filen er større end ${readableSize(MAX_FIL_BYTES)}.`;
      else if (!filTilladt(file.name)) fejl = "Filtypen er ikke tilladt.";
      else if (brugt + file.size > MAX_TASK_BYTES) fejl = `Opgaven ville overstige grænsen på ${readableSize(MAX_TASK_BYTES)}.`;

      const optimistisk: FilDTO = {
        id: temp, navn: file.name, type: filTypeLabel(file.name),
        meta: [mig.navn, readableSize(file.size)].join(" · "),
        harData: false, uploaderId: mig.id, bytes: file.size, pending: !fejl, fejl: fejl || undefined,
      };
      setData((d) => patchFiler(d, taskId, (filer) => [...filer, optimistisk]));
      if (fejl) continue; // klient-afvist — kun inline-fejl, intet server-kald
      brugt += file.size;

      const fd = new FormData();
      fd.set("taskId", taskId);
      fd.set("file", file);
      startTransition(async () => {
        try {
          const res = await uploadAttachment(fd);
          if (res.ok && res.file) {
            setData((d) => patchFiler(d, taskId, (filer) => filer.map((x) => (x.id === temp ? res.file! : x))));
          } else {
            setData((d) => patchFiler(d, taskId, (filer) => filer.map((x) => (x.id === temp ? { ...x, pending: false, fejl: res.error || "Upload fejlede." } : x))));
          }
        } catch {
          setData((d) => patchFiler(d, taskId, (filer) => filer.map((x) => (x.id === temp ? { ...x, pending: false, fejl: "Upload fejlede." } : x))));
        }
      });
    }
  };

  // Slet-rettighed: admin må alt, ellers kun ejer/creator.
  const kanSlette = (creatorId: string | null | undefined) =>
    erAdmin(mig.rolle) || (!!creatorId && creatorId === mig.id);

  function udfoerSlet() {
    if (!sletMaal) return;
    const maal = sletMaal;
    setSletMaal(null);
    // Optimistisk: fjern fra træet med det samme + naviger væk.
    const snapshotNav = nav;
    if (maal.type === "opgave") {
      if (panelId === maal.id) setPanelId(null);
      setData((d) => ({ ...d, kunder: d.kunder.map((k) => ({ ...k, boards: k.boards.map((b) => ({ ...b, grupper: b.grupper.map((g) => ({ ...g, opgaver: g.opgaver.filter((o) => o.id !== maal.id) })) })) })) }));
    } else if (maal.type === "board") {
      if (nav.type === "board" && nav.boardId === maal.id) setNav({ type: "dashboard", kundeId: maal.kundeId });
      setData((d) => ({ ...d, kunder: d.kunder.map((k) => ({ ...k, boards: k.boards.filter((b) => b.id !== maal.id) })) }));
    } else if (maal.type === "fil") {
      setData((d) => patchFiler(d, maal.taskId, (filer) => filer.filter((f) => f.id !== maal.id)));
    } else {
      if ("kundeId" in nav && nav.kundeId === maal.id) setNav({ type: "forside" });
      setData((d) => ({ ...d, kunder: d.kunder.filter((k) => k.id !== maal.id), dashboard: d.dashboard.filter((c) => c.id !== maal.id) }));
    }
    startTransition(async () => {
      const res =
        maal.type === "opgave"
          ? await deleteTask(maal.id)
          : maal.type === "board"
            ? await deleteBoard(maal.id)
            : maal.type === "fil"
              ? await deleteAttachment(maal.id)
              : await deleteCustomer(maal.id);
      if (res.ok) {
        visToast('"' + maal.navn + '" blev slettet.');
      } else {
        visToast(res.reason || "Kunne ikke slette.");
        setNav(snapshotNav);
        router.refresh(); // rul den optimistiske sletning tilbage
      }
    });
  }

  function visToast(besked: string) {
    setToast(besked);
    window.setTimeout(() => setToast(null), 4500);
  }

  // Næste ledige palettefarve (ikke allerede brugt af en kunde).
  function naesteFriFarve(): string {
    const brugt = new Set(data.kunder.map((k) => k.farve));
    return KUNDE_FARVER.find((c) => !brugt.has(c)) || KUNDE_FARVER[0];
  }

  function aabnNyKundeModal() {
    setModal({ type: "kunde" });
    setModalVaerdi("");
    setModalFarve(naesteFriFarve());
  }

  // ================================================================
  // LOGIN håndteres af /login. Her renderes altid appen.
  // ================================================================
  const aktivKunde = "kundeId" in nav ? kunde(nav.kundeId) : null;
  const aktivBoard = nav.type === "board" ? board(nav.kundeId, nav.boardId) : null;

  const topEyebrow =
    nav.type === "forside"
      ? "thirdbase"
      : nav.type === "mit"
        ? "Personlig oversigt"
        : nav.type === "overblik"
          ? "thirdbase"
          : aktivKunde
            ? aktivKunde.branche
            : "";
  const topTitel =
    nav.type === "forside"
      ? "Dashboard"
      : nav.type === "mit"
        ? "Mit arbejde"
        : nav.type === "overblik"
          ? "Alle kunder"
          : nav.type === "dashboard"
            ? (aktivKunde?.navn ?? "") + " · Dashboard"
            : aktivKunde && aktivBoard
              ? aktivKunde.navn + " · " + aktivBoard.navn
              : "";

  const q = soeg.trim().toLowerCase();
  const traef =
    q.length > 1
      ? alleOpgaver()
          .filter(
            (x) =>
              x.o.navn.toLowerCase().indexOf(q) >= 0 ||
              x.k.navn.toLowerCase().indexOf(q) >= 0 ||
              x.b.navn.toLowerCase().indexOf(q) >= 0,
          )
          .slice(0, 8)
      : [];

  const uleste = data.notifikationer.filter((n) => !n.read).length;

  const navStil = (aktiv: boolean) =>
    "text-align:left; padding:9px 12px; font-size:14px; border:0; cursor:pointer; background:" +
    (aktiv ? "#2A2A2A" : "transparent") +
    "; color:" +
    (aktiv ? "#FFFFFF" : "#C9CBD0") +
    "; border-left:2px solid " +
    (aktiv ? "#FF442B" : "transparent") +
    ";";

  return (
    <div style={{ height: "100vh", width: "100%", overflow: "hidden", background: "#F7F8F9", color: "#181818" }}>
      <div style={{ display: "grid", gridTemplateColumns: "264px 1fr", height: "100vh" }}>
        {/* ---------------- SIDEBAR ---------------- */}
        <div
          className="tb-scroll"
          style={{ background: "#181818", color: "#F7F8F9", display: "flex", flexDirection: "column", overflowY: "auto" }}
        >
          <div style={{ padding: "20px 18px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "8px 8px", gap: 2.5, transform: "rotate(45deg)" }}>
              <div style={{ width: 8, height: 8, background: "#FF442B" }} />
              <div style={{ width: 8, height: 8, background: "#FF442B" }} />
              <div style={{ width: 8, height: 8, background: "#FF442B" }} />
              <div style={{ width: 8, height: 8, background: "#FF442B" }} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>thirdbase</span>
          </div>

          <div style={{ padding: "0 10px", display: "flex", flexDirection: "column", gap: 2 }}>
            <button
              onClick={() => {
                setNav({ type: "forside" });
                setPanelId(null);
              }}
              style={sx(navStil(nav.type === "forside"))}
            >
              Forside
            </button>
            <button
              onClick={() => {
                setNav({ type: "mit" });
                setPanelId(null);
              }}
              style={sx(navStil(nav.type === "mit"))}
            >
              Mit arbejde
            </button>
            <button
              onClick={() => {
                setNav({ type: "overblik" });
                setPanelId(null);
              }}
              style={sx(navStil(nav.type === "overblik"))}
            >
              Overblik · alle kunder
            </button>
            {erAdmin(mig.rolle) && (
              <a href="/brugere" style={{ ...sx(navStil(false)), textDecoration: "none", display: "block" }}>
                Brugere
              </a>
            )}
          </div>

          <div style={{ padding: "24px 18px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#7A7A7A" }}>
              Kunder
            </span>
            <button
              onClick={aabnNyKundeModal}
              title="Ny kunde"
              style={{
                width: 20,
                height: 20,
                border: "1px solid #3A3A3A",
                background: "transparent",
                color: "#F7F8F9",
                fontSize: 13,
                lineHeight: 1,
                cursor: "pointer",
              }}
            >
              +
            </button>
          </div>

          <div style={{ padding: "0 10px 24px", display: "flex", flexDirection: "column", gap: 1 }}>
            {data.kunder.map((k) => {
              const aaben = !!aabneKunder[k.id];
              const kAktiv = "kundeId" in nav && nav.kundeId === k.id;
              return (
                <div key={k.id}>
                  <button
                    onClick={() => setAabneKunder((a) => ({ ...a, [k.id]: !aaben }))}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      width: "100%",
                      padding: "8px 10px",
                      fontSize: 13,
                      border: 0,
                      cursor: "pointer",
                      background: kAktiv ? "#232323" : "transparent",
                      color: "#E6E7EA",
                    }}
                  >
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 9,
                        fontWeight: 700,
                        color: "#fff",
                        flex: "none",
                        background: "#33343A",
                      }}
                    >
                      {k.kort}
                    </span>
                    <span
                      style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {k.navn}
                    </span>
                    <span style={{ fontSize: 9, color: "#7A7A7A" }}>{aaben ? "▾" : "▸"}</span>
                  </button>
                  {aaben && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 1, padding: "2px 0 8px 34px" }}>
                      <button
                        onClick={() => {
                          setNav({ type: "dashboard", kundeId: k.id });
                          setPanelId(null);
                        }}
                        style={{
                          textAlign: "left",
                          background: "transparent",
                          border: 0,
                          fontSize: 12.5,
                          padding: "6px 8px",
                          cursor: "pointer",
                          color: nav.type === "dashboard" && nav.kundeId === k.id ? "#FF442B" : "#9E9E9E",
                        }}
                      >
                        Dashboard
                      </button>
                      {k.boards.map((b) => {
                        const aktiv = nav.type === "board" && nav.boardId === b.id;
                        return (
                          <button
                            key={b.id}
                            onClick={() => {
                              setNav({ type: "board", kundeId: k.id, boardId: b.id });
                              setPanelId(null);
                              setVisning("tabel");
                            }}
                            style={{
                              textAlign: "left",
                              background: "transparent",
                              border: 0,
                              fontSize: 12.5,
                              padding: "6px 8px",
                              cursor: "pointer",
                              color: aktiv ? "#FFFFFF" : "#9E9E9E",
                              fontWeight: aktiv ? 600 : 400,
                            }}
                          >
                            {b.navn}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => {
                          setModal({ type: "board", kundeId: k.id });
                          setModalVaerdi("");
                        }}
                        style={{
                          textAlign: "left",
                          background: "transparent",
                          border: 0,
                          color: "#6E6E6E",
                          fontSize: 12,
                          padding: "6px 8px",
                          cursor: "pointer",
                        }}
                      >
                        + Nyt board
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: "auto",
              padding: "14px 16px",
              borderTop: "1px solid #2A2A2A",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={sx(AV(mig.f, 30))}>{mig.ini}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {mig.navn}
              </div>
              <div style={{ fontSize: 11, color: "#7A7A7A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {mig.rolle}
              </div>
            </div>
            <a
              href="/indstillinger"
              title="Indstillinger"
              style={{ color: "#7A7A7A", fontSize: 14, lineHeight: 1, textDecoration: "none" }}
            >
              ⚙
            </a>
            <button
              onClick={() => act(() => logout())}
              title="Log ud"
              style={{ background: "transparent", border: 0, color: "#7A7A7A", fontSize: 11, cursor: "pointer" }}
            >
              Log ud
            </button>
          </div>
        </div>

        {/* ---------------- MAIN ---------------- */}
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, height: "100vh" }}>
          {/* Topbar */}
          <div
            style={{
              height: 64,
              flex: "none",
              background: "#fff",
              borderBottom: "1px solid #E6E8EC",
              display: "flex",
              alignItems: "center",
              gap: 20,
              padding: "0 28px",
              position: "relative",
              zIndex: 40,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9E9E9E" }}>
                {topEyebrow}
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {topTitel}
              </div>
            </div>

            {isPending && <span className="tb-spinner" title="Gemmer…" aria-label="Gemmer" />}

            <div style={{ marginLeft: "auto", position: "relative", width: 340 }}>
              <input
                value={soeg}
                onChange={(e) => setSoeg(e.target.value)}
                placeholder="Søg i opgaver og kunder…"
                style={{ width: "100%", height: 38, border: "1px solid #E1E4E9", background: "#F7F8F9", padding: "0 14px", fontSize: 14 }}
              />
              {q.length > 1 && (
                <div
                  style={{
                    position: "absolute",
                    top: 44,
                    left: 0,
                    right: 0,
                    background: "#fff",
                    border: "1px solid #E1E4E9",
                    boxShadow: "0 12px 32px rgba(24,24,24,.12)",
                    maxHeight: 380,
                    overflow: "auto",
                    zIndex: 50,
                  }}
                >
                  {traef.map((x) => (
                    <button
                      key={x.o.id}
                      onClick={() => {
                        setNav({ type: "board", kundeId: x.k.id, boardId: x.b.id });
                        setPanelId(x.o.id);
                        setSoeg("");
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        background: "transparent",
                        border: 0,
                        borderBottom: "1px solid #F0F1F4",
                        padding: "10px 14px",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: 14, color: "#181818" }}>{x.o.navn}</div>
                      <div style={{ fontSize: 12, color: "#9E9E9E", marginTop: 2 }}>
                        {x.k.navn + " · " + x.b.navn + " · " + x.g.navn}
                      </div>
                    </button>
                  ))}
                  {traef.length === 0 && <div style={{ padding: 14, fontSize: 13, color: "#9E9E9E" }}>Ingen resultater.</div>}
                </div>
              )}
            </div>

            <div style={{ position: "relative" }}>
              <button
                onClick={() => {
                  const naaAaben = !visNoti;
                  setVisNoti(naaAaben);
                  if (naaAaben && uleste > 0) doMarkNotisRead();
                }}
                style={{
                  width: 38,
                  height: 38,
                  border: "1px solid #E1E4E9",
                  background: "#fff",
                  cursor: "pointer",
                  position: "relative",
                  fontSize: 15,
                }}
              >
                <span>🔔</span>
                {uleste > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      minWidth: 17,
                      height: 17,
                      background: "#FF442B",
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 4px",
                    }}
                  >
                    {uleste}
                  </span>
                )}
              </button>
              {visNoti && (
                <div
                  style={{
                    position: "absolute",
                    top: 44,
                    right: 0,
                    width: 360,
                    background: "#fff",
                    border: "1px solid #E1E4E9",
                    boxShadow: "0 12px 32px rgba(24,24,24,.12)",
                    zIndex: 50,
                  }}
                >
                  <div
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid #F0F1F4",
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#9E9E9E",
                    }}
                  >
                    Notifikationer
                  </div>
                  {data.notifikationer.length === 0 && (
                    <div style={{ padding: "14px 16px", fontSize: 13, color: "#9E9E9E" }}>Ingen notifikationer.</div>
                  )}
                  {data.notifikationer.map((n) => (
                    <div key={n.id} style={{ padding: "12px 16px", borderBottom: "1px solid #F0F1F4", display: "flex", gap: 12 }}>
                      <div style={sx(PRIK(n.farve, 8, " margin-top:6px;"))} />
                      <div>
                        <div style={{ fontSize: 13, lineHeight: 1.45, color: "#181818" }}>{n.tekst}</div>
                        <div style={{ fontSize: 11, color: "#9E9E9E", marginTop: 3 }}>{n.tid}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Indhold */}
          <div className="tb-scroll" style={{ flex: 1, overflow: "auto", position: "relative" }}>
            {nav.type === "forside" && renderForside()}
            {nav.type === "mit" && renderMitArbejde()}
            {nav.type === "overblik" && renderOverblik()}
            {nav.type === "dashboard" && aktivKunde && renderDashboard(aktivKunde)}
            {nav.type === "board" && aktivBoard && renderBoard(aktivBoard)}
          </div>
        </div>
      </div>

      {panelId && renderPanel()}
      {modal && renderModal()}
      {sletMaal && renderSletDialog()}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 90,
            background: "#181818",
            color: "#fff",
            fontSize: 14,
            padding: "12px 20px",
            boxShadow: "0 12px 32px rgba(24,24,24,.28)",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );

  // ================================================================
  // VIEWS
  // ================================================================
  function renderMitArbejde() {
    const mine = alleOpgaver().filter((x) => x.o.ansvarlige.indexOf(mig.id) >= 0 && x.o.status !== "Færdig");
    const bucket: Record<string, Flat[]> = { forsinket: [], idag: [], uge: [], senere: [] };
    mine.forEach((x) => {
      const d = x.o.slut ? dage(x.o.slut) : 99;
      if (d < 0) bucket.forsinket.push(x);
      else if (d === 0) bucket.idag.push(x);
      else if (d <= 6) bucket.uge.push(x);
      else bucket.senere.push(x);
    });
    const ks: Record<string, number> = {};
    mine.forEach((x) => (ks[x.k.id] = 1));

    const grupper = [
      { navn: "Forsinket", farve: "#FF442B", liste: bucket.forsinket },
      { navn: "I dag", farve: "#FF8A65", liste: bucket.idag },
      { navn: "Denne uge", farve: "#3355FF", liste: bucket.uge },
      { navn: "Senere", farve: "#9E9E9E", liste: bucket.senere },
    ];

    return (
      <div style={{ padding: "32px 28px 64px", maxWidth: 1100 }}>
        <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em" }}>Hej {mig.navn.split(" ")[0]}</div>
        <div style={{ fontSize: 15, color: "#6E6E6E", marginTop: 8 }}>
          Du har {mine.length} åbne opgaver fordelt på {Object.keys(ks).length} kunder.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 32, marginTop: 36 }}>
          {grupper.map((g) => (
            <div key={g.navn}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={sx(PRIK(g.farve, 9))} />
                <div style={{ fontSize: 15, fontWeight: 600 }}>{g.navn}</div>
                <div style={{ fontSize: 13, color: "#9E9E9E" }}>{g.liste.length}</div>
              </div>
              <div style={{ background: "#fff", border: "1px solid #E6E8EC" }}>
                {g.liste.map((x) => {
                  const s = statusOf(x.o.status);
                  const p = prioOf(x.o.prioritet);
                  return (
                    <div
                      key={x.o.id}
                      onClick={() => {
                        setNav({ type: "board", kundeId: x.k.id, boardId: x.b.id });
                        setPanelId(x.o.id);
                      }}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 200px 150px 110px",
                        gap: 16,
                        alignItems: "center",
                        padding: "14px 18px",
                        borderBottom: "1px solid #F0F1F4",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 15, color: "#181818", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {x.o.navn}
                        </div>
                        <div style={{ fontSize: 12, color: "#9E9E9E", marginTop: 3 }}>{x.k.navn + " · " + x.b.navn}</div>
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "5px 10px",
                          textAlign: "center",
                          justifySelf: "start",
                          background: s.f,
                          color: s.t,
                        }}
                      >
                        {x.o.status}
                      </div>
                      <div style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={sx(PRIK(p.f, 8))} />
                        {x.o.prioritet}
                      </div>
                      <div style={{ fontSize: 13, textAlign: "right", color: deadlineFarve(x.o.status, x.o.slut) }}>
                        {dtoTekst(x.o.slut)}
                      </div>
                    </div>
                  );
                })}
                {g.liste.length === 0 && <div style={{ padding: 18, fontSize: 13, color: "#9E9E9E" }}>Ingen opgaver.</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderOverblik() {
    const alle = alleOpgaver();
    const aabne = alle.filter((x) => x.o.status !== "Færdig");
    const kpi = [
      { label: "Åbne opgaver", vaerdi: aabne.length, farve: "#181818" },
      { label: "Forsinkede", vaerdi: aabne.filter((x) => x.o.slut && dage(x.o.slut) < 0).length, farve: "#FF442B" },
      { label: "Aktive kunder", vaerdi: data.kunder.length, farve: "#181818" },
      { label: "Boards i drift", vaerdi: data.kunder.reduce((a, k) => a + k.boards.length, 0), farve: "#3355FF" },
    ];
    const maks = 12;
    const maksK = Math.max(1, ...data.kunder.map((k) => aabne.filter((x) => x.k.id === k.id).length));

    return (
      <div style={{ padding: "32px 28px 64px" }}>
        <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em" }}>Overblik</div>
        <div style={{ fontSize: 15, color: "#6E6E6E", marginTop: 8 }}>Arbejdsbelastning og status på tværs af alle kunder.</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 32 }}>
          {kpi.map((k) => (
            <div key={k.label} style={{ background: "#fff", border: "1px solid #E6E8EC", padding: 20 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9E9E9E" }}>{k.label}</div>
              <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-0.02em", marginTop: 10, color: k.farve }}>{k.vaerdi}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 16, marginTop: 16, alignItems: "start" }}>
          <div style={{ background: "#fff", border: "1px solid #E6E8EC", padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Arbejdsbelastning pr. teammedlem</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {data.brugere.map((b) => {
                const bmine = aabne.filter((x) => x.o.ansvarlige.indexOf(b.id) >= 0);
                return (
                  <div key={b.id}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={sx(AV(b.f, 26))}>{b.ini}</div>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{b.navn}</span>
                      <span style={{ marginLeft: "auto", fontSize: 13, color: "#6E6E6E" }}>{bmine.length} åbne opgaver</span>
                    </div>
                    <div style={{ height: 10, background: "#F0F1F4", display: "flex" }}>
                      {STATUS.filter((s) => s.navn !== "Færdig").map((s) => {
                        const n = bmine.filter((x) => x.o.status === s.navn).length;
                        return <div key={s.navn} title={s.navn + ": " + n} style={{ width: (n / maks) * 100 + "%", background: s.f }} />;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid #E6E8EC", padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Åbne opgaver pr. kunde</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {data.kunder.map((k) => {
                const n = aabne.filter((x) => x.k.id === k.id).length;
                return (
                  <div key={k.id} onClick={() => setNav({ type: "dashboard", kundeId: k.id })} style={{ cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}>
                      <span>{k.navn}</span>
                      <span style={{ color: "#6E6E6E" }}>{n} åbne</span>
                    </div>
                    <div style={{ height: 8, background: "#F0F1F4" }}>
                      <div style={{ height: 8, width: (n / maksK) * 100 + "%", background: "#FF442B" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderDashboard(k: KundeDTO) {
    const alle = alleOpgaver().filter((x) => x.k.id === k.id);
    const aabne = alle.filter((x) => x.o.status !== "Færdig");
    const kpi = [
      { label: "Åbne opgaver", vaerdi: aabne.length, farve: "#181818" },
      { label: "Forsinkede", vaerdi: aabne.filter((x) => x.o.slut && dage(x.o.slut) < 0).length, farve: "#FF442B" },
      { label: "Færdige i alt", vaerdi: alle.length - aabne.length, farve: "#16A34A" },
      { label: "Boards", vaerdi: k.boards.length, farve: "#3355FF" },
    ];

    let akk = 0;
    const stops: string[] = [];
    const fordeling = STATUS.map((s) => ({ navn: s.navn, farve: s.f, antal: alle.filter((x) => x.o.status === s.navn).length }));
    fordeling.forEach((s) => {
      const p = (s.antal / Math.max(alle.length, 1)) * 100;
      stops.push(s.farve + " " + akk + "% " + (akk + p) + "%");
      akk += p;
    });
    const maksP = Math.max(1, ...data.brugere.map((b) => aabne.filter((x) => x.o.ansvarlige.indexOf(b.id) >= 0).length));
    const deadlines = aabne
      .slice()
      .sort((a, b) => ((a.o.slut || "") < (b.o.slut || "") ? -1 : 1))
      .slice(0, 6);

    return (
      <div style={{ padding: "32px 28px 64px" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16, gap: 8 }}>
          <span style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9E9E9E" }}>Farve</span>
          {KUNDE_FARVER.map((c) => (
            <button
              key={c}
              onClick={() => doSetCustomerColor(k.id, c)}
              title={c}
              aria-label={"Vælg farve " + c}
              style={{
                width: 22,
                height: 22,
                background: c,
                border: k.farve === c ? "2px solid #181818" : "2px solid transparent",
                outline: "1px solid #E1E4E9",
                cursor: "pointer",
              }}
            />
          ))}
          {kanSlette(k.creatorId) && (
            <button
              onClick={() => setSletMaal({ type: "kunde", id: k.id, navn: k.navn })}
              title="Slet kunde"
              style={{ marginLeft: "auto", height: 34, border: "1px solid #E1E4E9", color: "#B4291A", background: "#fff", fontSize: 13, padding: "0 14px", cursor: "pointer" }}
            >
              Slet kunde
            </button>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {kpi.map((c) => (
            <div key={c.label} style={{ background: "#fff", border: "1px solid #E6E8EC", padding: 20 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9E9E9E" }}>{c.label}</div>
              <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-0.02em", marginTop: 10, color: c.farve }}>{c.vaerdi}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 16, alignItems: "start" }}>
          {/* Donut */}
          <div style={{ background: "#fff", border: "1px solid #E6E8EC", padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Fordeling på status</div>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div
                style={{
                  width: 132,
                  height: 132,
                  borderRadius: "50%",
                  flex: "none",
                  position: "relative",
                  background: "conic-gradient(" + stops.join(", ") + ")",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 34,
                    background: "#fff",
                    borderRadius: "50%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div style={{ fontSize: 22, fontWeight: 600 }}>{alle.length}</div>
                  <div style={{ fontSize: 10, color: "#9E9E9E" }}>opgaver</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {fordeling.map((s) => (
                  <div key={s.navn} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13 }}>
                    <span style={sx(PRIK(s.farve, 9))} />
                    <span style={{ color: "#4A4A4A" }}>{s.navn}</span>
                    <span style={{ color: "#9E9E9E" }}>{s.antal}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Søjler */}
          <div style={{ background: "#fff", border: "1px solid #E6E8EC", padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Opgaver pr. teammedlem</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 18, height: 150 }}>
              {data.brugere.map((b) => {
                const n = aabne.filter((x) => x.o.ansvarlige.indexOf(b.id) >= 0).length;
                return (
                  <div
                    key={b.id}
                    style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end" }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{n}</div>
                    <div style={{ width: "100%", height: Math.max((n / maksP) * 110, 3), background: b.f }} />
                    <div style={{ fontSize: 11, color: "#9E9E9E" }}>{b.ini}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Deadlines */}
          <div style={{ background: "#fff", border: "1px solid #E6E8EC", padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Kommende deadlines</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {deadlines.map((x) => (
                <div
                  key={x.o.id}
                  onClick={() => {
                    setNav({ type: "board", kundeId: x.k.id, boardId: x.b.id });
                    setPanelId(x.o.id);
                  }}
                  style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid #F0F1F4", cursor: "pointer" }}
                >
                  <div style={{ width: 52, flex: "none", fontSize: 12, fontWeight: 600, color: deadlineFarve(x.o.status, x.o.slut) }}>
                    {dtoTekst(x.o.slut)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.o.navn}</div>
                    <div style={{ fontSize: 11, color: "#9E9E9E", marginTop: 2 }}>{x.b.navn}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderBoard(b: BoardDTO) {
    const boardOpgaver: { o: OpgaveDTO; g: GruppeDTO }[] = [];
    b.grupper.forEach((g) => g.opgaver.forEach((o) => passerFilter(o) && boardOpgaver.push({ o, g })));
    const harFilter = !!(filter.person || filter.status || filter.prio);

    const visninger: { navn: string; key: "tabel" | "kanban" | "gantt" }[] = [
      { navn: "Tabel", key: "tabel" },
      { navn: "Kanban", key: "kanban" },
      { navn: "Tidslinje", key: "gantt" },
    ];

    return (
      <div>
        {/* View-tabs + filtre */}
        <div
          style={{
            background: "#fff",
            borderBottom: "1px solid #E6E8EC",
            padding: "0 28px",
            display: "flex",
            alignItems: "center",
            gap: 28,
            position: "sticky",
            top: 0,
            zIndex: 20,
          }}
        >
          <div style={{ display: "flex", gap: 4 }}>
            {visninger.map((v) => {
              const aktiv = visning === v.key;
              return (
                <button
                  key={v.key}
                  onClick={() => setVisning(v.key)}
                  style={{
                    background: "transparent",
                    border: 0,
                    borderBottom: "2px solid " + (aktiv ? "#FF442B" : "transparent"),
                    padding: "18px 14px",
                    fontSize: 14,
                    fontWeight: aktiv ? 600 : 400,
                    color: aktiv ? "#181818" : "#6E6E6E",
                    cursor: "pointer",
                  }}
                >
                  {v.navn}
                </button>
              );
            })}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, padding: "10px 0" }}>
            <span style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9E9E9E", marginRight: 2 }}>
              Filter
            </span>
            <select
              value={filter.person}
              onChange={(e) => setFilter((f) => ({ ...f, person: e.target.value }))}
              style={{ height: 32, border: "1px solid #E1E4E9", background: "#fff", fontSize: 13, padding: "0 8px" }}
            >
              <option value="">Alle personer</option>
              {data.brugere.map((bb) => (
                <option key={bb.id} value={bb.id}>
                  {bb.navn}
                </option>
              ))}
            </select>
            <select
              value={filter.status}
              onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
              style={{ height: 32, border: "1px solid #E1E4E9", background: "#fff", fontSize: 13, padding: "0 8px" }}
            >
              <option value="">Alle statusser</option>
              {STATUS.map((s) => (
                <option key={s.navn} value={s.navn}>
                  {s.navn}
                </option>
              ))}
            </select>
            <select
              value={filter.prio}
              onChange={(e) => setFilter((f) => ({ ...f, prio: e.target.value }))}
              style={{ height: 32, border: "1px solid #E1E4E9", background: "#fff", fontSize: 13, padding: "0 8px" }}
            >
              <option value="">Alle prioriteter</option>
              {PRIO.map((p) => (
                <option key={p.navn} value={p.navn}>
                  {p.navn}
                </option>
              ))}
            </select>
            {harFilter && (
              <button
                onClick={() => setFilter({ person: "", status: "", prio: "" })}
                style={{ height: 32, border: "1px solid #FF442B", color: "#FF442B", background: "#fff", fontSize: 13, padding: "0 10px", cursor: "pointer" }}
              >
                Ryd
              </button>
            )}
            {kanSlette(b.creatorId) && (
              <button
                onClick={() => setSletMaal({ type: "board", id: b.id, navn: b.navn, kundeId: aktivKunde?.id || "" })}
                title="Slet board"
                style={{ height: 32, border: "1px solid #E1E4E9", color: "#B4291A", background: "#fff", fontSize: 13, padding: "0 12px", cursor: "pointer" }}
              >
                Slet board
              </button>
            )}
          </div>
        </div>

        {visning === "tabel" && renderTabel(b)}
        {visning === "kanban" && renderKanban(boardOpgaver)}
        {visning === "gantt" && renderGantt(boardOpgaver)}
      </div>
    );
  }

  function renderTabel(b: BoardDTO) {
    return (
      <div style={{ padding: "24px 28px 80px", minWidth: 1180 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {b.grupper.map((g) => {
            const synlige = g.opgaver.filter(passerFilter);
            const total = Math.max(synlige.length, 1);
            const gaaben = !foldet[g.id];
            return (
              <div key={g.id}>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragRef.current) doMoveTask(dragRef.current, g.id, null);
                    dragRef.current = null;
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 0 10px" }}
                >
                  <button
                    onClick={() => setFoldet((f) => ({ ...f, [g.id]: !gaaben ? false : true }))}
                    style={{ background: "transparent", border: 0, fontSize: 11, cursor: "pointer", padding: 0, width: 14, color: g.farve }}
                  >
                    {gaaben ? "▾" : "▸"}
                  </button>
                  <div style={{ fontSize: 16, fontWeight: 600, color: g.farve }}>{g.navn}</div>
                  <div style={{ fontSize: 12, color: "#9E9E9E" }}>{synlige.length} opgaver</div>
                  <div style={{ width: 170, height: 8, display: "flex", background: "#F0F1F4", marginLeft: 8 }}>
                    {STATUS.map((s) => {
                      const n = synlige.filter((o) => o.status === s.navn).length;
                      return <div key={s.navn} title={s.navn + ": " + n} style={{ width: (n / total) * 100 + "%", background: s.f }} />;
                    })}
                  </div>
                </div>

                {gaaben && (
                  <div style={{ background: "#fff", border: "1px solid #E6E8EC", borderLeft: "4px solid " + g.farve }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(300px,1fr) 132px 158px 128px 118px 176px minmax(180px,1fr)",
                        alignItems: "center",
                        borderBottom: "1px solid #F0F1F4",
                        fontSize: 11,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "#9E9E9E",
                      }}
                    >
                      <div style={{ padding: "10px 16px" }}>Opgave</div>
                      <div style={{ padding: "10px 12px" }}>Ansvarlig</div>
                      <div style={{ padding: "10px 12px" }}>Status</div>
                      <div style={{ padding: "10px 12px" }}>Prioritet</div>
                      <div style={{ padding: "10px 12px" }}>Deadline</div>
                      <div style={{ padding: "10px 12px" }}>Tidslinje</div>
                      <div style={{ padding: "10px 16px" }}>Noter</div>
                    </div>

                    {synlige.map((o) => renderRaekke(o, g))}

                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 16px", height: 44 }}>
                      <span style={{ color: "#C4C7CE", fontSize: 14 }}>+</span>
                      <input
                        value={nyOpgave[g.id] || ""}
                        onChange={(e) => setNyOpgave((n) => ({ ...n, [g.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const v = nyOpgave[g.id] || "";
                            if (v.trim()) doAddTask(g.id, v);
                            setNyOpgave((n) => ({ ...n, [g.id]: "" }));
                          }
                        }}
                        placeholder="Tilføj opgave"
                        style={{ flex: 1, border: 0, background: "transparent", fontSize: 14, height: 32 }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderRaekke(o: OpgaveDTO, g: GruppeDTO) {
    const s = statusOf(o.status);
    const p = prioOf(o.prioritet);
    const udf = !!udfoldet[o.id];
    const faerdigeUnder = o.underopgaver.filter((u) => u.faerdig).length;

    return (
      <div
        key={o.id}
        draggable
        onDragStart={(e) => {
          dragRef.current = o.id;
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (dragRef.current && dragRef.current !== o.id) doMoveTask(dragRef.current, g.id, o.id);
          dragRef.current = null;
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(300px,1fr) 132px 158px 128px 118px 176px minmax(180px,1fr)",
            alignItems: "stretch",
            borderBottom: "1px solid #F0F1F4",
            minHeight: 44,
          }}
        >
          <div style={{ padding: "0 16px", display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span style={{ color: "#C4C7CE", fontSize: 12, cursor: "grab" }}>⠿</span>
            {o.underopgaver.length > 0 && (
              <button
                onClick={() => setUdfoldet((u) => ({ ...u, [o.id]: !udf }))}
                style={{ background: "transparent", border: 0, color: "#9E9E9E", fontSize: 10, cursor: "pointer", padding: 0, width: 12 }}
              >
                {udf ? "▾" : "▸"}
              </button>
            )}
            <span
              onClick={() => setPanelId(o.id)}
              style={{ fontSize: 14, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {o.navn}
            </span>
            {o.underopgaver.length > 0 && (
              <span style={{ fontSize: 11, color: "#9E9E9E", flex: "none" }}>
                {faerdigeUnder + "/" + o.underopgaver.length}
              </span>
            )}
            {o.kommentarer.length > 0 && (
              <span onClick={() => setPanelId(o.id)} style={{ marginLeft: "auto", fontSize: 11, color: "#C4C7CE", cursor: "pointer", flex: "none" }}>
                💬 {o.kommentarer.length}
              </span>
            )}
          </div>

          <div style={{ padding: "0 12px", display: "flex", alignItems: "center" }}>
            {o.ansvarlige.map((id) => {
              const bb = bruger(id);
              return (
                <div key={id} title={bb.navn} style={sx(AV(bb.f, 26, " margin-right:-6px; border:2px solid #fff;"))}>
                  {bb.ini}
                </div>
              );
            })}
          </div>

          <div style={{ position: "relative", borderLeft: "1px solid #F0F1F4" }}>
            <button
              onClick={() => {
                setStatusMenu(statusMenu === o.id ? null : o.id);
                setPrioMenu(null);
              }}
              style={{
                width: "100%",
                height: "100%",
                minHeight: 44,
                border: 0,
                cursor: "pointer",
                fontSize: 12.5,
                fontWeight: 600,
                background: s.f,
                color: s.t,
              }}
            >
              {o.status}
            </button>
            {statusMenu === o.id && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  width: 158,
                  background: "#fff",
                  border: "1px solid #E1E4E9",
                  boxShadow: "0 10px 26px rgba(24,24,24,.14)",
                  zIndex: 30,
                }}
              >
                {STATUS.map((x) => (
                  <button
                    key={x.navn}
                    onClick={() => {
                      setStatusMenu(null);
                      doSetStatus(o.id, x.navn);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "9px 12px",
                      fontSize: 12.5,
                      fontWeight: 600,
                      border: 0,
                      cursor: "pointer",
                      background: x.f,
                      color: x.t,
                    }}
                  >
                    {x.navn}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ position: "relative", borderLeft: "1px solid #F0F1F4" }}>
            <button
              onClick={() => {
                setPrioMenu(prioMenu === o.id ? null : o.id);
                setStatusMenu(null);
              }}
              style={{
                width: "100%",
                height: "100%",
                minHeight: 44,
                border: 0,
                cursor: "pointer",
                fontSize: 12.5,
                textAlign: "left",
                padding: "0 12px",
                background: "transparent",
                color: p.f,
                fontWeight: 500,
              }}
            >
              {o.prioritet}
            </button>
            {prioMenu === o.id && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  width: 128,
                  background: "#fff",
                  border: "1px solid #E1E4E9",
                  boxShadow: "0 10px 26px rgba(24,24,24,.14)",
                  zIndex: 30,
                }}
              >
                {PRIO.map((x) => (
                  <button
                    key={x.navn}
                    onClick={() => {
                      setPrioMenu(null);
                      doSetPriority(o.id, x.navn);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "9px 12px",
                      fontSize: 12.5,
                      border: 0,
                      borderBottom: "1px solid #F0F1F4",
                      cursor: "pointer",
                      background: "#fff",
                      color: x.f,
                    }}
                  >
                    {x.navn}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div
            style={{ padding: "0 12px", display: "flex", alignItems: "center", fontSize: 13, borderLeft: "1px solid #F0F1F4", color: deadlineFarve(o.status, o.slut) }}
          >
            {dtoTekst(o.slut)}
          </div>
          <div style={{ padding: "0 12px", display: "flex", alignItems: "center", fontSize: 12, color: "#6E6E6E", borderLeft: "1px solid #F0F1F4" }}>
            {dtoTekst(o.start) + " – " + dtoTekst(o.slut)}
          </div>
          <div
            onClick={() => setPanelId(o.id)}
            style={{ padding: "0 16px", display: "flex", alignItems: "center", fontSize: 13, color: "#6E6E6E", borderLeft: "1px solid #F0F1F4", cursor: "pointer", overflow: "hidden" }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.noter || "—"}</span>
          </div>
        </div>

        {udf && o.underopgaver.length > 0 && (
          <div style={{ background: "#FBFBFC", borderBottom: "1px solid #F0F1F4" }}>
            {o.underopgaver.map((u) => {
              const ansv = bruger(o.ansvarlige[0] || mig.id);
              return (
                <div
                  key={u.id}
                  style={{ display: "grid", gridTemplateColumns: "minmax(300px,1fr) 132px 158px", alignItems: "center", minHeight: 38, borderTop: "1px solid #F0F1F4" }}
                >
                  <div style={{ padding: "0 16px 0 52px", display: "flex", alignItems: "center", gap: 10 }}>
                    <button
                      onClick={() => doToggleSubtask(o.id, u.id)}
                      style={{
                        width: 16,
                        height: 16,
                        flex: "none",
                        cursor: "pointer",
                        fontSize: 10,
                        lineHeight: 1,
                        color: "#fff",
                        border: "1px solid " + (u.faerdig ? "#16A34A" : "#C4C7CE"),
                        background: u.faerdig ? "#16A34A" : "#fff",
                      }}
                    >
                      {u.faerdig ? "✓" : ""}
                    </button>
                    <span style={{ fontSize: 13, color: u.faerdig ? "#9E9E9E" : "#4A4A4A" }}>{u.navn}</span>
                  </div>
                  <div style={{ padding: "0 12px" }}>
                    <div style={sx(AV(ansv.f, 22))}>{ansv.ini}</div>
                  </div>
                  <div style={{ padding: "0 12px", fontSize: 12, color: "#9E9E9E" }}>{u.faerdig ? "Færdig" : "Åben"}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function renderKanban(boardOpgaver: { o: OpgaveDTO; g: GruppeDTO }[]) {
    return (
      <div className="tb-scroll" style={{ padding: "24px 28px 80px", overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", minWidth: 1100 }}>
          {STATUS.map((s) => {
            const kort = boardOpgaver.filter((x) => x.o.status === s.navn);
            return (
              <div
                key={s.navn}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragRef.current) doSetStatus(dragRef.current, s.navn);
                  dragRef.current = null;
                }}
                style={{ flex: 1, minWidth: 210, background: "#fff", border: "1px solid #E6E8EC" }}
              >
                <div style={{ padding: "12px 14px", borderBottom: "1px solid #F0F1F4", display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={sx(PRIK(s.f, 9))} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{s.navn}</span>
                  <span style={{ marginLeft: "auto", fontSize: 12, color: "#9E9E9E" }}>{kort.length}</span>
                </div>
                <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 10, minHeight: 120 }}>
                  {kort.map((x) => (
                    <div
                      key={x.o.id}
                      draggable
                      onDragStart={(e) => {
                        dragRef.current = x.o.id;
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onClick={() => setPanelId(x.o.id)}
                      style={{ border: "1px solid #E6E8EC", borderTop: "3px solid " + prioOf(x.o.prioritet).f, padding: 12, cursor: "pointer", background: "#fff" }}
                    >
                      <div style={{ fontSize: 13, lineHeight: 1.4, textWrap: "pretty" }}>{x.o.navn}</div>
                      <div style={{ fontSize: 11, color: "#9E9E9E", marginTop: 6 }}>{x.g.navn}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                        {x.o.ansvarlige.map((id) => {
                          const bb = bruger(id);
                          return (
                            <div key={id} title={bb.navn} style={sx(AV(bb.f, 22))}>
                              {bb.ini}
                            </div>
                          );
                        })}
                        <span style={{ marginLeft: "auto", fontSize: 11, color: deadlineFarve(x.o.status, x.o.slut) }}>{dtoTekst(x.o.slut)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderGantt(boardOpgaver: { o: OpgaveDTO; g: GruppeDTO }[]) {
    const origin = new Date("2026-07-27");
    const spanDage = 63;
    const uger: { label: string }[] = [];
    for (let i = 0; i < 9; i++) {
      const d = new Date(origin.getTime() + i * 7 * 86400000);
      uger.push({ label: "Uge " + (31 + i) + " · " + d.getDate() + "/" + (d.getMonth() + 1) });
    }
    return (
      <div className="tb-scroll" style={{ padding: "24px 28px 80px", overflowX: "auto" }}>
        <div style={{ background: "#fff", border: "1px solid #E6E8EC", minWidth: 1100 }}>
          <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", borderBottom: "1px solid #F0F1F4" }}>
            <div style={{ padding: "12px 16px", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9E9E9E" }}>Opgave</div>
            <div style={{ display: "flex", borderLeft: "1px solid #F0F1F4" }}>
              {uger.map((u, i) => (
                <div key={i} style={{ flex: 1, padding: "12px 8px", fontSize: 11, color: "#9E9E9E", borderRight: "1px solid #F5F6F8" }}>
                  {u.label}
                </div>
              ))}
            </div>
          </div>
          {boardOpgaver.map((x) => {
            const st = Math.max((new Date(x.o.start || "2026-07-27").getTime() - origin.getTime()) / 86400000, 0);
            const en = Math.min((new Date(x.o.slut || "2026-07-27").getTime() - origin.getTime()) / 86400000 + 1, spanDage);
            const s = statusOf(x.o.status);
            const periode = dtoTekst(x.o.start) + " – " + dtoTekst(x.o.slut);
            return (
              <div
                key={x.o.id}
                onClick={() => setPanelId(x.o.id)}
                style={{ display: "grid", gridTemplateColumns: "300px 1fr", borderBottom: "1px solid #F5F6F8", cursor: "pointer" }}
              >
                <div style={{ padding: "11px 16px", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.o.navn}</div>
                <div style={{ position: "relative", borderLeft: "1px solid #F0F1F4", padding: "9px 0" }}>
                  <div
                    title={periode}
                    style={{
                      position: "relative",
                      marginLeft: (st / spanDage) * 100 + "%",
                      width: (Math.max(en - st, 2) / spanDage) * 100 + "%",
                      height: 24,
                      background: s.f,
                      color: s.t,
                      fontSize: 10.5,
                      display: "flex",
                      alignItems: "center",
                      padding: "0 8px",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {periode}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ================================================================
  // PANEL
  // ================================================================
  function renderPanel() {
    const x = panelId ? findOpgave(panelId) : null;
    if (!x) return null;
    const o = x.o;
    const s = statusOf(o.status);
    const p = prioOf(o.prioritet);
    const faerdigeUnder = o.underopgaver.filter((u) => u.faerdig).length;
    const filBytes = o.filer.reduce((sum, f) => sum + (f.bytes || 0), 0);

    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", justifyContent: "flex-end" }}>
        <div onClick={() => setPanelId(null)} style={{ position: "absolute", inset: 0, background: "rgba(24,24,24,.28)" }} />
        <div className="tb-scroll" style={{ position: "relative", width: 520, height: "100vh", background: "#fff", borderLeft: "1px solid #E6E8EC", overflowY: "auto" }}>
          <div style={{ padding: "24px 28px 18px", borderBottom: "1px solid #F0F1F4" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9E9E9E" }}>
                  {x.k.navn + " · " + x.b.navn + " · " + x.g.navn}
                </div>
                <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", marginTop: 8, lineHeight: 1.25, textWrap: "pretty" }}>
                  {o.navn}
                </div>
              </div>
              {kanSlette(o.creatorId) && (
                <button
                  onClick={() => setSletMaal({ type: "opgave", id: o.id, navn: o.navn })}
                  title="Slet opgave"
                  style={{ height: 30, border: "1px solid #E1E4E9", background: "#fff", cursor: "pointer", fontSize: 12, color: "#B4291A", flex: "none", padding: "0 10px" }}
                >
                  Slet
                </button>
              )}
              <button
                onClick={() => setPanelId(null)}
                style={{ width: 30, height: 30, border: "1px solid #E1E4E9", background: "#fff", cursor: "pointer", fontSize: 14, color: "#6E6E6E", flex: "none" }}
              >
                ✕
              </button>
            </div>
          </div>

          <div style={{ padding: "22px 28px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 16px", borderBottom: "1px solid #F0F1F4" }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9E9E9E", marginBottom: 8 }}>Status</div>
              <select
                value={o.status}
                onChange={(e) => doSetStatus(o.id, e.target.value)}
                style={{ width: "100%", height: 40, border: 0, fontSize: 13.5, fontWeight: 600, padding: "0 10px", cursor: "pointer", background: s.f, color: s.t }}
              >
                {STATUS.map((ss) => (
                  <option key={ss.navn} value={ss.navn}>
                    {ss.navn}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9E9E9E", marginBottom: 8 }}>Prioritet</div>
              <select
                value={o.prioritet}
                onChange={(e) => doSetPriority(o.id, e.target.value)}
                style={{ width: "100%", height: 40, border: "1px solid #E1E4E9", fontSize: 13.5, padding: "0 10px", cursor: "pointer", background: "#fff", color: p.f, fontWeight: 600 }}
              >
                {PRIO.map((pp) => (
                  <option key={pp.navn} value={pp.navn}>
                    {pp.navn}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9E9E9E", marginBottom: 8 }}>Ansvarlige</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", position: "relative" }}>
                {o.ansvarlige.map((id) => {
                  const bb = bruger(id);
                  return (
                    <span key={id} title={bb.navn} style={{ position: "relative", display: "inline-flex" }}>
                      <span style={sx(AV(bb.f, 30))}>{bb.ini}</span>
                      <button
                        onClick={() => doUnassign(o.id, id)}
                        title={"Fjern " + bb.navn}
                        style={{ position: "absolute", top: -5, right: -5, width: 16, height: 16, lineHeight: 1, fontSize: 11, border: "1px solid #E1E4E9", background: "#fff", color: "#6E6E6E", cursor: "pointer", padding: 0, borderRadius: "50%" }}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
                <button
                  onClick={() => setVisAnsvarligMenu((v) => !v)}
                  title="Tilføj ansvarlig"
                  style={{ width: 30, height: 30, border: "1px dashed #C4C7CE", background: "#fff", color: "#6E6E6E", fontSize: 16, lineHeight: 1, cursor: "pointer" }}
                >
                  +
                </button>
                {visAnsvarligMenu && (
                  <div style={{ position: "absolute", top: 38, left: 0, width: 250, background: "#fff", border: "1px solid #E1E4E9", boxShadow: "0 10px 26px rgba(24,24,24,.14)", zIndex: 30, maxHeight: 300, overflow: "auto" }}>
                    {data.brugere.filter((b) => o.ansvarlige.indexOf(b.id) < 0).map((b) => (
                      <button
                        key={b.id}
                        onClick={() => {
                          setVisAnsvarligMenu(false);
                          doAssign(o.id, b.id);
                        }}
                        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", background: "transparent", border: 0, borderBottom: "1px solid #F0F1F4", padding: "9px 12px", cursor: "pointer" }}
                      >
                        <span style={sx(AV(b.f, 24))}>{b.ini}</span>
                        <span style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: 13, color: "#181818" }}>{b.navn}</span>
                          <span style={{ fontSize: 11, color: "#9E9E9E" }}>{b.rolle}</span>
                        </span>
                      </button>
                    ))}
                    {data.brugere.filter((b) => o.ansvarlige.indexOf(b.id) < 0).length === 0 && (
                      <div style={{ padding: 12, fontSize: 13, color: "#9E9E9E" }}>Alle brugere er tilføjet.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9E9E9E", marginBottom: 8 }}>Tidslinje</div>
              <div style={{ fontSize: 14, color: deadlineFarve(o.status, o.slut) }}>{dtoTekst(o.start) + " – " + dtoTekst(o.slut)}</div>
            </div>
          </div>

          <div style={{ padding: "22px 28px", borderBottom: "1px solid #F0F1F4" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9E9E9E", marginBottom: 10 }}>Noter</div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: "#4A4A4A", textWrap: "pretty" }}>{o.noter || "Ingen noter endnu."}</div>
          </div>

          {o.underopgaver.length > 0 && (
            <div style={{ padding: "22px 28px", borderBottom: "1px solid #F0F1F4" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9E9E9E", marginBottom: 12 }}>
                Underopgaver {faerdigeUnder + "/" + o.underopgaver.length}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {o.underopgaver.map((u) => (
                  <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button
                      onClick={() => doToggleSubtask(o.id, u.id)}
                      style={{
                        width: 18,
                        height: 18,
                        flex: "none",
                        cursor: "pointer",
                        fontSize: 11,
                        lineHeight: 1,
                        color: "#fff",
                        border: "1px solid " + (u.faerdig ? "#16A34A" : "#C4C7CE"),
                        background: u.faerdig ? "#16A34A" : "#fff",
                      }}
                    >
                      {u.faerdig ? "✓" : ""}
                    </button>
                    <span style={{ fontSize: 14, color: u.faerdig ? "#9E9E9E" : "#181818" }}>{u.navn}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ padding: "22px 28px", borderBottom: "1px solid #F0F1F4" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9E9E9E" }}>Filer</div>
              <div style={{ fontSize: 11, color: "#9E9E9E" }}>{readableSize(filBytes)} / {readableSize(MAX_TASK_BYTES)}</div>
            </div>

            {/* Dropzone: klik åbner filvælger, eller træk filer hertil */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setFilDragOver(true);
              }}
              onDragLeave={() => setFilDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setFilDragOver(false);
                if (e.dataTransfer.files?.length) doUploadFiler(o.id, e.dataTransfer.files);
              }}
              style={{
                border: "1px dashed " + (filDragOver ? "#3355FF" : "#C4C7CE"),
                background: filDragOver ? "#F2F5FF" : "#FAFBFC",
                padding: "18px 12px",
                textAlign: "center",
                cursor: "pointer",
                fontSize: 13,
                color: filDragOver ? "#3355FF" : "#6E6E6E",
                transition: "background 120ms, border-color 120ms",
              }}
            >
              Klik eller træk filer hertil · maks {readableSize(MAX_FIL_BYTES)} pr. fil
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files?.length) doUploadFiler(o.id, e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: o.filer.length ? 12 : 0 }}>
              {o.filer.map((f) => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid #E6E8EC", padding: "10px 12px", opacity: f.pending ? 0.7 : 1 }}>
                  <div
                    style={{
                      width: 30, height: 30, flex: "none", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 700, background: f.harData ? "#EAF0FF" : "#F0F1F4", color: f.harData ? "#3355FF" : "#B0B0B0",
                    }}
                  >
                    {f.type}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, color: f.harData ? "#181818" : "#9E9E9E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.navn}
                    </div>
                    <div style={{ fontSize: 11, color: f.harData ? "#9E9E9E" : "#B0B0B0" }}>
                      {f.pending ? "Uploader…" : f.harData ? f.meta : "ingen fil gemt"}
                    </div>
                    {f.fejl && <div style={{ fontSize: 11, color: "#B4291A", marginTop: 2 }}>{f.fejl}</div>}
                  </div>
                  {f.pending && <span className="tb-spinner" />}
                  {f.harData && !f.pending && (
                    <a
                      href={"/api/attachments/" + f.id}
                      style={{ fontSize: 12, color: "#3355FF", flex: "none", textDecoration: "none" }}
                      title="Hent fil"
                    >
                      Hent
                    </a>
                  )}
                  {!f.pending && kanSletteFil(f) && (
                    <button
                      onClick={() => setSletMaal({ type: "fil", id: f.id, navn: f.navn, taskId: o.id })}
                      title="Slet fil"
                      style={{ border: "1px solid #E1E4E9", background: "#fff", color: "#B4291A", fontSize: 12, padding: "3px 8px", cursor: "pointer", flex: "none" }}
                    >
                      Slet
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: "22px 28px", borderBottom: "1px solid #F0F1F4" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9E9E9E", marginBottom: 14 }}>Kommentarer</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {o.kommentarer.map((c) => {
                const bb = bruger(c.u);
                const dele = c.tekst.split(/(@[A-ZÆØÅ][a-zæøå]+ [A-ZÆØÅ][a-zæøå]+)/g);
                return (
                  <div key={c.id} style={{ display: "flex", gap: 12 }}>
                    <div style={sx(AV(bb.f, 30))}>{bb.ini}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{bb.navn}</span>
                        <span style={{ fontSize: 11, color: "#9E9E9E" }}>{c.tid}</span>
                      </div>
                      <div style={{ fontSize: 14, lineHeight: 1.55, color: "#4A4A4A", marginTop: 4, textWrap: "pretty" }}>
                        {dele.map((d, i) =>
                          d.charAt(0) === "@" ? (
                            <span key={i} style={{ color: "#3355FF", fontWeight: 600 }}>
                              {d}
                            </span>
                          ) : (
                            <span key={i}>{d}</span>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 20, border: "1px solid #E1E4E9" }}>
              <textarea
                value={kommentarUdkast}
                onChange={(e) => setKommentarUdkast(e.target.value)}
                placeholder="Skriv en opdatering… brug @ for at nævne en kollega"
                style={{ width: "100%", border: 0, padding: 12, fontSize: 14, minHeight: 74, resize: "vertical", display: "block" }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderTop: "1px solid #F0F1F4", background: "#FAFBFC" }}>
                {data.brugere.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setKommentarUdkast((k) => (k + " @" + b.navn).trim() + " ")}
                    style={{ border: "1px solid #E1E4E9", background: "#fff", fontSize: 11, padding: "4px 8px", cursor: "pointer", color: "#3355FF" }}
                  >
                    {"@" + b.navn.split(" ")[0]}
                  </button>
                ))}
                <button
                  onClick={() => {
                    const t = kommentarUdkast.trim();
                    if (!t) return;
                    doAddComment(o.id, t);
                    setKommentarUdkast("");
                  }}
                  style={{ marginLeft: "auto", background: "#181818", color: "#fff", border: 0, fontSize: 13, fontWeight: 500, padding: "7px 16px", cursor: "pointer" }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          <div style={{ padding: "22px 28px 40px" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9E9E9E", marginBottom: 14 }}>Aktivitetslog</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {o.log.map((l, i) => (
                <div key={i} style={{ display: "flex", gap: 12, paddingBottom: 14 }}>
                  <div style={sx(PRIK(l.farve, 7, " margin-top:6px;"))} />
                  <div>
                    <div style={{ fontSize: 13, color: "#4A4A4A", lineHeight: 1.5 }}>{l.tekst}</div>
                    <div style={{ fontSize: 11, color: "#9E9E9E", marginTop: 2 }}>{l.tid}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ================================================================
  // MODAL (ny kunde / nyt board)
  // ================================================================
  function renderModal() {
    if (!modal) return null;
    const erKunde = modal.type === "kunde";
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(24,24,24,.32)" }}>
        <div style={{ width: 420, background: "#fff", border: "1px solid #E6E8EC", padding: 28 }}>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>{erKunde ? "Opret ny kunde" : "Opret nyt board"}</div>
          <div style={{ fontSize: 13, color: "#6E6E6E", marginTop: 6 }}>
            {erKunde
              ? "Kunden får sit eget workspace med tre standardgrupper."
              : "Boardet oprettes med grupperne Denne uge, Backlog og Afsluttet."}
          </div>
          <input
            value={modalVaerdi}
            onChange={(e) => setModalVaerdi(e.target.value)}
            placeholder={erKunde ? "fx Hvidbjerg Entreprise A/S" : "fx Leadgenerering"}
            style={{ width: "100%", height: 44, border: "1px solid #DDE0E5", padding: "0 14px", fontSize: 15, marginTop: 20 }}
            autoFocus
          />
          {erKunde && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9E9E9E", marginBottom: 10 }}>Farve</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {KUNDE_FARVER.map((c) => (
                  <button
                    key={c}
                    onClick={() => setModalFarve(c)}
                    title={c}
                    aria-label={"Vælg farve " + c}
                    style={{
                      width: 28,
                      height: 28,
                      background: c,
                      border: modalFarve === c ? "2px solid #181818" : "2px solid transparent",
                      outline: "1px solid #E1E4E9",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
            <button
              onClick={() => {
                setModal(null);
                setModalVaerdi("");
              }}
              style={{ height: 40, padding: "0 16px", border: "1px solid #E1E4E9", background: "#fff", fontSize: 14, cursor: "pointer" }}
            >
              Annullér
            </button>
            <button
              onClick={gemModal}
              style={{ height: 40, padding: "0 20px", border: 0, background: "#FF442B", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Opret
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================================================================
  // FORSIDE — dashboard med ét kort pr. virksomhed (aggregeret server-side)
  // ================================================================
  function renderForside() {
    const kort = data.dashboard;
    return (
      <div style={{ padding: "32px 28px 64px" }}>
        <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em" }}>Dashboard</div>
        <div style={{ fontSize: 15, color: "#6E6E6E", marginTop: 8 }}>Status på tværs af alle virksomheder.</div>

        {kort.length === 0 ? (
          <div style={{ marginTop: 40, background: "#fff", border: "1px solid #E6E8EC", padding: "56px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Ingen kunder endnu</div>
            <div style={{ fontSize: 14, color: "#6E6E6E", marginTop: 8 }}>Opret din første kunde for at komme i gang.</div>
            <button
              onClick={aabnNyKundeModal}
              style={{ marginTop: 20, height: 44, padding: "0 20px", border: 0, background: "#FF442B", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Opret kunde
            </button>
          </div>
        ) : (
          <div className="tb-kort-grid" style={{ marginTop: 28 }}>
            {kort.map((k) => renderKundeKort(k))}
          </div>
        )}
      </div>
    );
  }

  function renderKundeKort(k: DashboardKortDTO) {
    const aabne = k.opgaver - k.faerdige;
    const goTo = () => {
      setPanelId(null);
      if (k.foersteBoardId) {
        setAabneKunder((a) => ({ ...a, [k.id]: true }));
        setNav({ type: "board", kundeId: k.id, boardId: k.foersteBoardId });
        setVisning("tabel");
      } else {
        setNav({ type: "dashboard", kundeId: k.id });
      }
    };
    return (
      <div
        key={k.id}
        onClick={goTo}
        style={{ background: "#fff", border: "1px solid #E6E8EC", borderTop: "3px solid " + k.farve, padding: 20, cursor: "pointer", display: "flex", flexDirection: "column" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flex: "none", background: k.farve }}>
            {k.kort}
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k.navn}</div>
            <div style={{ fontSize: 12, color: "#9E9E9E", marginTop: 2 }}>
              {k.boards} {k.boards === 1 ? "projekt" : "projekter"} · {k.opgaver} opgaver
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6E6E6E", marginBottom: 6 }}>
            <span>{k.faerdige}/{k.opgaver} færdige</span>
            <span style={{ fontWeight: 600, color: "#181818" }}>{k.procent}%</span>
          </div>
          <div style={{ height: 8, background: "#F0F1F4" }}>
            <div style={{ height: 8, width: k.procent + "%", background: k.farve }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <div style={{ flex: 1, background: "#F7F8F9", padding: "10px 12px" }}>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{aabne}</div>
            <div style={{ fontSize: 11, color: "#9E9E9E" }}>Åbne</div>
          </div>
          <div style={{ flex: 1, background: "#F7F8F9", padding: "10px 12px" }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: k.overskredne > 0 ? "#FF442B" : "#181818" }}>{k.overskredne}</div>
            <div style={{ fontSize: 11, color: "#9E9E9E" }}>Overskredne</div>
          </div>
        </div>

        {k.naeste.length > 0 && (
          <div style={{ marginTop: 16, borderTop: "1px solid #F0F1F4", paddingTop: 14 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9E9E9E", marginBottom: 10 }}>Næste deadlines</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {k.naeste.map((n) => (
                <div
                  key={n.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setAabneKunder((a) => ({ ...a, [k.id]: true }));
                    setNav({ type: "board", kundeId: k.id, boardId: n.boardId });
                    setPanelId(n.id);
                  }}
                  style={{ display: "flex", gap: 10, alignItems: "baseline", cursor: "pointer" }}
                >
                  <span style={{ width: 44, flex: "none", fontSize: 12, fontWeight: 600, color: deadlineFarve("", n.slut) }}>{dtoTekst(n.slut)}</span>
                  <span style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.navn}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ================================================================
  // SLET-BEKRÆFTELSE
  // ================================================================
  function renderSletDialog() {
    if (!sletMaal) return null;
    const typeNavn =
      sletMaal.type === "opgave" ? "opgave" : sletMaal.type === "board" ? "board" : sletMaal.type === "fil" ? "fil" : "kunde";
    const advarsel =
      sletMaal.type === "kunde"
        ? "Alle boards, opgaver, kommentarer og notifikationer under kunden slettes permanent."
        : sletMaal.type === "board"
          ? "Alle grupper, opgaver og kommentarer under boardet slettes permanent."
          : sletMaal.type === "fil"
            ? "Filen fjernes permanent fra opgaven."
            : "Opgaven med underopgaver og kommentarer slettes permanent.";
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(24,24,24,.32)" }}>
        <div style={{ width: 440, background: "#fff", border: "1px solid #E6E8EC", padding: 28 }}>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>Slet {typeNavn}?</div>
          <div style={{ fontSize: 14, color: "#4A4A4A", marginTop: 12, lineHeight: 1.55 }}>
            Du er ved at slette <strong>{sletMaal.navn}</strong>. {advarsel} Handlingen kan ikke fortrydes.
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
            <button
              onClick={() => setSletMaal(null)}
              style={{ height: 40, padding: "0 16px", border: "1px solid #E1E4E9", background: "#fff", fontSize: 14, cursor: "pointer" }}
            >
              Annullér
            </button>
            <button
              onClick={udfoerSlet}
              style={{ height: 40, padding: "0 20px", border: 0, background: "#FF442B", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Slet {typeNavn}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function gemModal() {
    if (!modal) return;
    const navn = modalVaerdi.trim();
    if (!navn) return;
    const m = modal;
    setModal(null);
    setModalVaerdi("");

    const tmpGroups = (): GruppeDTO[] => [
      { id: tmpId(), navn: "Denne uge", farve: "#FF442B", opgaver: [] },
      { id: tmpId(), navn: "Backlog", farve: "#9E9E9E", opgaver: [] },
      { id: tmpId(), navn: "Afsluttet", farve: "#16A34A", opgaver: [] },
    ];

    if (m.type === "kunde") {
      const kid = tmpId();
      const bid = tmpId();
      const kort = navn.slice(0, 2).toUpperCase();
      const nyKunde: KundeDTO = {
        id: kid, navn, kort, branche: "Ny kunde", farve: modalFarve, creatorId: mig.id,
        boards: [{ id: bid, navn: "Onboarding", creatorId: mig.id, grupper: tmpGroups() }],
      };
      const nyKort: DashboardKortDTO = {
        id: kid, navn, kort, farve: modalFarve, boards: 1, opgaver: 0, faerdige: 0, procent: 0, overskredne: 0, foersteBoardId: bid, naeste: [],
      };
      setData((d) => ({ ...d, kunder: [...d.kunder, nyKunde], dashboard: [...d.dashboard, nyKort] }));
      setAabneKunder((a) => ({ ...a, [kid]: true }));
      setNav({ type: "board", kundeId: kid, boardId: bid });
      setVisning("tabel");
      startTransition(async () => {
        try {
          const res = await createCustomer(navn, modalFarve);
          if (res) {
            setAabneKunder((a) => ({ ...a, [res.kundeId]: true }));
            setNav({ type: "board", kundeId: res.kundeId, boardId: res.boardId });
          }
          router.refresh(); // reconcile med rigtige id'er (bl.a. gruppe-id'er)
        } catch {
          visToast("Kunden kunne ikke oprettes.");
          router.refresh();
        }
      });
    } else {
      const kundeId = m.kundeId;
      const bid = tmpId();
      const nyBoard: BoardDTO = { id: bid, navn, creatorId: mig.id, grupper: tmpGroups() };
      setData((d) => ({ ...d, kunder: d.kunder.map((k) => (k.id === kundeId ? { ...k, boards: [...k.boards, nyBoard] } : k)) }));
      setNav({ type: "board", kundeId, boardId: bid });
      setVisning("tabel");
      startTransition(async () => {
        try {
          const res = await createBoard(kundeId, navn);
          if (res) setNav({ type: "board", kundeId: res.kundeId, boardId: res.boardId });
          router.refresh();
        } catch {
          visToast("Boardet kunne ikke oprettes.");
          router.refresh();
        }
      });
    }
  }
}
