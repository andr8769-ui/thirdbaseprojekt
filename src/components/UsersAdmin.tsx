"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUser, resendInvite, deleteUser, type BrugerResultat } from "@/app/actions";

type Row = {
  id: string;
  navn: string;
  email: string;
  rolle: string;
  status: "Aktiv" | "Inviteret";
  tidspunkt: string;
  sidsteLogin: string | null;
  opgaver: number;
};

const TRANSPORT_LABEL: Record<string, string> = { resend: "Resend", smtp: "SMTP", none: "ingen transport" };

const KOLONNER = "minmax(150px,1.3fr) minmax(170px,1.5fr) 110px 100px 140px 190px";

export default function UsersAdmin({ brugere, megId }: { brugere: Row[]; megId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [navn, setNavn] = useState("");
  const [email, setEmail] = useState("");
  const [resultat, setResultat] = useState<BrugerResultat | null>(null);
  const [rowMsg, setRowMsg] = useState<Record<string, { ok: boolean; tekst: string }>>({});
  // Bruger der er valgt til fjernelse (viser bekræftelsesdialog), og evt. fejl.
  const [fjern, setFjern] = useState<Row | null>(null);
  const [fjernFejl, setFjernFejl] = useState<string | null>(null);

  function opret() {
    setResultat(null);
    start(async () => {
      const res = await createUser(navn, email);
      setResultat(res);
      if (res.ok) {
        setNavn("");
        setEmail("");
        router.refresh();
      }
    });
  }

  function genudsend(r: Row) {
    setRowMsg((m) => ({ ...m, [r.id]: { ok: true, tekst: "Sender…" } }));
    start(async () => {
      const res = await resendInvite(r.id);
      const tekst = res.ok
        ? res.mail?.ok
          ? `Invitation sendt via ${TRANSPORT_LABEL[res.mail.transport] || res.mail.transport}.`
          : `Mail fejlede: ${res.mail?.error || "ukendt fejl"}`
        : res.error || "Kunne ikke sende.";
      setRowMsg((m) => ({ ...m, [r.id]: { ok: !!(res.ok && res.mail?.ok), tekst } }));
    });
  }

  function bekraeftFjern() {
    if (!fjern) return;
    const id = fjern.id;
    setFjernFejl(null);
    start(async () => {
      const res = await deleteUser(id);
      if (res.ok) {
        setFjern(null);
        router.refresh();
      } else {
        setFjernFejl(res.reason || "Kunne ikke fjerne brugeren.");
      }
    });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F7F8F9", color: "#181818" }}>
      <div style={{ maxWidth: 940, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div style={{ display: "grid", gridTemplateColumns: "9px 9px", gap: 3, transform: "rotate(45deg)" }}>
            <div style={{ width: 9, height: 9, background: "#FF442B" }} />
            <div style={{ width: 9, height: 9, background: "#FF442B" }} />
            <div style={{ width: 9, height: 9, background: "#FF442B" }} />
            <div style={{ width: 9, height: 9, background: "#FF442B" }} />
          </div>
          <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>thirdbase</span>
          <a href="/" style={{ marginLeft: "auto", fontSize: 13, color: "#6E6E6E" }}>
            ← Tilbage til projektstyring
          </a>
        </div>

        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>Brugere</div>
        <div style={{ fontSize: 15, color: "#6E6E6E", marginTop: 8 }}>
          Opret kolleger som brugere, før de selv har logget ind, og send dem en velkomstmail.
        </div>

        {/* Opret bruger */}
        <div style={{ background: "#fff", border: "1px solid #E6E8EC", marginTop: 28 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #F0F1F4", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9E9E9E" }}>
            Opret bruger
          </div>
          <div style={{ padding: 20, display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 13, fontWeight: 500, color: "#4A4A4A", flex: "1 1 200px" }}>
              Navn
              <input
                value={navn}
                onChange={(e) => setNavn(e.target.value)}
                placeholder="fx Louise Sand"
                style={{ height: 42, border: "1px solid #DDE0E5", background: "#fff", padding: "0 12px", fontSize: 14 }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 13, fontWeight: 500, color: "#4A4A4A", flex: "1 1 240px" }}>
              E-mail (@thirdbase.dk)
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="navn@thirdbase.dk"
                style={{ height: 42, border: "1px solid #DDE0E5", background: "#fff", padding: "0 12px", fontSize: 14 }}
              />
            </label>
            <button
              onClick={opret}
              disabled={pending}
              style={{ height: 42, padding: "0 20px", border: 0, background: "#FF442B", color: "#fff", fontSize: 14, fontWeight: 600, cursor: pending ? "wait" : "pointer" }}
            >
              {pending ? "Opretter…" : "Opret og send velkomstmail"}
            </button>
          </div>

          {resultat && (
            <div style={{ padding: "0 20px 20px" }}>
              {!resultat.ok ? (
                <div style={{ border: "1px solid #FFD7CF", background: "#FFF3F0", color: "#B4291A", fontSize: 13, padding: "12px 14px" }}>
                  {resultat.error}
                </div>
              ) : resultat.mail?.transport === "none" ? (
                <div style={{ border: "1px solid #FFE0B0", background: "#FFF8EC", color: "#8A5A00", fontSize: 13, padding: "12px 14px" }}>
                  Bruger oprettet. Ingen mail-transport er konfigureret, så der blev ikke sendt en velkomstmail.
                </div>
              ) : (
                <div style={{ border: "1px solid #BBE7C8", background: "#F0FBF3", color: "#12813C", fontSize: 13, padding: "12px 14px" }}>
                  Bruger oprettet. Velkomstmail sendes til <strong>{resultat.mail?.to}</strong> via{" "}
                  {TRANSPORT_LABEL[resultat.mail?.transport || "none"] || resultat.mail?.transport} i baggrunden.
                  Brug <strong>Send invitation igen</strong> for at se et konkret leveringsresultat.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Brugertabel */}
        <div style={{ background: "#fff", border: "1px solid #E6E8EC", marginTop: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: KOLONNER,
              borderBottom: "1px solid #F0F1F4",
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#9E9E9E",
            }}
          >
            <div style={{ padding: "12px 16px" }}>Navn</div>
            <div style={{ padding: "12px 12px" }}>E-mail</div>
            <div style={{ padding: "12px 12px" }}>Rolle</div>
            <div style={{ padding: "12px 12px" }}>Status</div>
            <div style={{ padding: "12px 12px" }}>Oprettet</div>
            <div style={{ padding: "12px 16px" }}>Handling</div>
          </div>

          {brugere.map((r) => (
            <div key={r.id}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: KOLONNER,
                  alignItems: "center",
                  borderBottom: "1px solid #F5F6F8",
                  minHeight: 52,
                }}
              >
                <div style={{ padding: "8px 16px", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.navn}
                  {r.id === megId && <span style={{ marginLeft: 8, fontSize: 11, color: "#9E9E9E" }}>(dig)</span>}
                </div>
                <div style={{ padding: "8px 12px", fontSize: 13, color: "#4A4A4A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.email}</div>
                <div style={{ padding: "8px 12px", fontSize: 13, color: "#4A4A4A" }}>{r.rolle}</div>
                <div style={{ padding: "8px 12px" }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "4px 9px",
                      background: r.status === "Aktiv" ? "#EAF7EE" : "#FFF1EC",
                      color: r.status === "Aktiv" ? "#16A34A" : "#B4291A",
                    }}
                  >
                    {r.status}
                  </span>
                </div>
                <div style={{ padding: "8px 12px", fontSize: 13, color: "#6E6E6E" }}>{r.tidspunkt}</div>
                <div style={{ padding: "8px 16px", display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={() => genudsend(r)}
                    disabled={pending}
                    style={{ height: 32, border: "1px solid #E1E4E9", background: "#fff", fontSize: 12.5, padding: "0 10px", cursor: pending ? "wait" : "pointer", color: "#3355FF" }}
                  >
                    Send invitation igen
                  </button>
                  {/* Fjern vises aldrig på én selv. Siden er allerede admin-gated. */}
                  {r.id !== megId && (
                    <button
                      onClick={() => {
                        setFjernFejl(null);
                        setFjern(r);
                      }}
                      disabled={pending}
                      style={{ height: 32, border: "1px solid #F3C9C2", background: "#fff", fontSize: 12.5, padding: "0 10px", cursor: pending ? "wait" : "pointer", color: "#B4291A" }}
                    >
                      Fjern
                    </button>
                  )}
                </div>
              </div>
              {rowMsg[r.id] && (
                <div
                  style={{
                    padding: "8px 16px 12px",
                    fontSize: 12.5,
                    color: rowMsg[r.id].ok ? "#12813C" : "#B4291A",
                    borderBottom: "1px solid #F5F6F8",
                  }}
                >
                  {rowMsg[r.id].tekst}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bekræftelsesdialog for fjernelse */}
      {fjern && (
        <div
          onClick={() => !pending && setFjern(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(24,24,24,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", border: "1px solid #E6E8EC", width: "100%", maxWidth: 460, padding: 28 }}
          >
            <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>Fjern bruger</div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: "#4A4A4A", marginTop: 14 }}>
              Du er ved at fjerne <strong>{fjern.navn}</strong> ({fjern.email}) fra thirdbase Projektstyring.
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: "#4A4A4A", marginTop: 12 }}>
              {fjern.opgaver === 0 ? (
                <>Brugeren er ikke ansvarlig på nogen opgaver.</>
              ) : (
                <>
                  Brugeren er ansvarlig på <strong>{fjern.opgaver}</strong> {fjern.opgaver === 1 ? "opgave" : "opgaver"}.
                  Opgaverne bliver bevaret, men brugeren fjernes som ansvarlig på dem.
                </>
              )}{" "}
              Kommentarer, filer og aktivitetslog bevares og viser navnet som historik.
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: "#B4291A", marginTop: 12 }}>
              Handlingen kan ikke fortrydes.
            </div>

            {fjernFejl && (
              <div style={{ marginTop: 14, border: "1px solid #FFD7CF", background: "#FFF3F0", color: "#B4291A", fontSize: 13, padding: "10px 12px" }}>
                {fjernFejl}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
              <button
                onClick={() => setFjern(null)}
                disabled={pending}
                style={{ height: 40, padding: "0 16px", border: "1px solid #E1E4E9", background: "#fff", fontSize: 14, fontWeight: 500, cursor: pending ? "wait" : "pointer", color: "#4A4A4A" }}
              >
                Annullér
              </button>
              <button
                onClick={bekraeftFjern}
                disabled={pending}
                style={{ height: 40, padding: "0 18px", border: 0, background: "#FF442B", color: "#fff", fontSize: 14, fontWeight: 600, cursor: pending ? "wait" : "pointer" }}
              >
                {pending ? "Fjerner…" : "Fjern bruger"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
