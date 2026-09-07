"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { opretKundeprojekt, type NytProjektInput } from "@/app/kundeprojekter/actions";
import { CRM_MODENHED, BASER, AFDAEKNING } from "@/lib/thirdbase-template";
import { Sidehoved, Besked, Knap, RAMME } from "@/components/KundeprojektFelter";

type Bruger = { id: string; navn: string };
type Kunde = { id: string; navn: string };

const TOM: NytProjektInput = {
  kundeNavn: "",
  cvr: "",
  kontaktpersonNavn: "",
  kontaktpersonTitel: "",
  kontaktpersonMail: "",
  kontaktpersonTelefon: "",
  projektansvarligId: "",
  deltagere: "",
  projektstart: "",
  forventetAfslutning: "",
  kadence: "",
  hubspotPortal: "",
  projektmappe: "",
  formaal: "",
  kundeId: "",
  udgangspunktKanaler: "",
  udgangspunktLeadsPrMaaned: "",
  udgangspunktSalgsproces: "",
  udgangspunktCrmModenhed: "",
  udgangspunktAutomatisering: "",
  udgangspunktHvorTabes: "",
};

export default function KundeprojektForm({
  brugere,
  kunder,
  laastKunde,
}: {
  brugere: Bruger[];
  kunder: Kunde[];
  /** Sat når formularen åbnes fra en kundes sidebar. Kunden er da forudvalgt og låst. */
  laastKunde?: Kunde | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState<NytProjektInput>(
    laastKunde ? { ...TOM, kundeId: laastKunde.id, kundeNavn: laastKunde.navn } : TOM,
  );
  const [fejl, setFejl] = useState<string | null>(null);
  // Husker hvad vi selv har auto-udfyldt, så et skift af kunde må rette det,
  // mens noget brugeren selv har skrevet får lov at stå.
  const autoNavnRef = useRef<string>(laastKunde ? laastKunde.navn : "");

  const saet = (felt: keyof NytProjektInput, vaerdi: string) => setV((x) => ({ ...x, [felt]: vaerdi }));

  /** Vælg kunde i systemet. Udfylder tekstfeltet Kunde med kundens navn, men
   *  kun hvis brugeren ikke selv har skrevet noget der. Egen tekst overskrives
   *  aldrig. */
  const vaelgKunde = (id: string) =>
    setV((x) => {
      const kunde = kunder.find((k) => k.id === id);
      const skalUdfyldes = !x.kundeNavn.trim() || x.kundeNavn === autoNavnRef.current;
      const navn = kunde && skalUdfyldes ? kunde.navn : x.kundeNavn;
      autoNavnRef.current = kunde && skalUdfyldes ? kunde.navn : autoNavnRef.current;
      return { ...x, kundeId: id, kundeNavn: navn };
    });

  function opret() {
    setFejl(null);
    if (!v.kundeId) {
      setFejl("Vælg hvilken kunde i systemet projektet hører til.");
      return;
    }
    if (!v.kundeNavn.trim()) {
      setFejl("Angiv et kundenavn.");
      return;
    }
    start(async () => {
      const res = await opretKundeprojekt(v);
      if (res.ok && res.id) router.push(`/kundeprojekter/${res.id}`);
      else setFejl(res.reason || "Kundeprojektet kunne ikke oprettes.");
    });
  }

  const felt = (label: string, n: keyof NytProjektInput, type?: string, placeholder?: string) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 13, fontWeight: 500, color: "#4A4A4A" }}>
      {label}
      <input
        type={type || "text"}
        value={v[n]}
        onChange={(e) => saet(n, e.target.value)}
        placeholder={placeholder}
        style={{ height: 40, border: "1px solid #DDE0E5", background: "#fff", padding: "0 12px", fontSize: 14, fontFamily: "inherit" }}
      />
    </label>
  );

  const omraade = (label: string, n: keyof NytProjektInput, placeholder?: string) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 13, fontWeight: 500, color: "#4A4A4A" }}>
      {label}
      <textarea
        value={v[n]}
        onChange={(e) => saet(n, e.target.value)}
        placeholder={placeholder}
        rows={3}
        style={{
          border: "1px solid #DDE0E5",
          background: "#fff",
          padding: "10px 12px",
          fontSize: 14,
          fontFamily: "inherit",
          resize: "vertical",
          lineHeight: 1.5,
        }}
      />
    </label>
  );

  const boks = (titel: string, children: React.ReactNode) => (
    <div style={{ background: "#fff", border: RAMME, marginTop: 16 }}>
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid #F0F1F4",
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#9E9E9E",
        }}
      >
        {titel}
      </div>
      <div style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        {children}
      </div>
    </div>
  );

  const antalSteps = BASER.reduce((n, b) => n + b.steps.length, 0);
  const antalTjek = BASER.reduce((n, b) => n + b.tjekliste.length, 0);
  const antalKpi = BASER.reduce((n, b) => n + b.kpier.length, 0);

  return (
    <div style={{ minHeight: "100vh", background: "#F7F8F9", color: "#181818" }}>
      <div className="tb-pad" style={{ maxWidth: 940, margin: "0 auto", padding: "48px 24px 80px" }}>
        <Sidehoved />

        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>Nyt kundeprojekt</div>
        <div style={{ fontSize: 15, color: "#6E6E6E", marginTop: 8, maxWidth: "64ch", lineHeight: 1.6 }}>
          Forløbet oprettes ud fra The Thirdbase Model. Skabelonen kopieres ind som den er, med{" "}
          {AFDAEKNING.length} afdækningsaktiviteter, {BASER.length} baser, {antalSteps} steps, {antalTjek}{" "}
          tjeklistepunkter og {antalKpi} KPI'er. Du udfylder stamdata her og resten undervejs.
          {laastKunde && (
            <>
              {" "}
              Projektet oprettes under <strong style={{ color: "#181818" }}>{laastKunde.navn}</strong> og vises i
              sidebaren under den kunde.
            </>
          )}
        </div>

        {fejl && (
          <div style={{ marginTop: 20 }}>
            <Besked tekst={fejl} type="fejl" />
          </div>
        )}

        {boks("Kunde", (
          <>
            <label style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 13, fontWeight: 500, color: "#4A4A4A" }}>
              Kunde i systemet
              {laastKunde ? (
                <div
                  style={{
                    height: 40,
                    border: "1px solid #DDE0E5",
                    background: "#F7F8F9",
                    padding: "0 12px",
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    color: "#4A4A4A",
                  }}
                  title="Kunden er valgt fra sidebaren og kan ikke ændres her"
                >
                  {laastKunde.navn}
                </div>
              ) : (
                <select
                  value={v.kundeId}
                  onChange={(e) => vaelgKunde(e.target.value)}
                  style={{
                    height: 40,
                    border: "1px solid " + (v.kundeId ? "#DDE0E5" : "#F3C9C2"),
                    background: "#fff",
                    padding: "0 10px",
                    fontSize: 14,
                    fontFamily: "inherit",
                    color: v.kundeId ? "#181818" : "#9E9E9E",
                  }}
                >
                  <option value="">Vælg kunde</option>
                  {kunder.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.navn}
                    </option>
                  ))}
                </select>
              )}
              <span style={{ fontSize: 12.5, color: "#6E6E6E", fontWeight: 400, lineHeight: 1.5 }}>
                Projektet lægger sig under kunden i menuen til venstre, ligesom et board.
              </span>
            </label>
            {felt("Kunde", "kundeNavn", "text", "Virksomhedsnavn")}
            {felt("CVR", "cvr", "text", "8 cifre")}
          </>
        ))}

        {boks("Kontaktperson hos kunden", (
          <>
            {felt("Navn", "kontaktpersonNavn")}
            {felt("Titel", "kontaktpersonTitel")}
            {felt("Mail", "kontaktpersonMail", "email")}
            {felt("Telefon", "kontaktpersonTelefon")}
          </>
        ))}

        {boks("Projekt", (
          <>
            <label style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 13, fontWeight: 500, color: "#4A4A4A" }}>
              Projektansvarlig hos Thirdbase
              <select
                value={v.projektansvarligId}
                onChange={(e) => saet("projektansvarligId", e.target.value)}
                style={{ height: 40, border: "1px solid #DDE0E5", background: "#fff", padding: "0 10px", fontSize: 14, fontFamily: "inherit" }}
              >
                <option value="">Ikke valgt</option>
                {brugere.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.navn}
                  </option>
                ))}
              </select>
            </label>
            {felt("Øvrige deltagere", "deltagere", "text", "Navne og roller")}
            {felt("Projektstart", "projektstart", "date")}
            {felt("Forventet afslutning", "forventetAfslutning", "date")}
            {felt("Aftalt kadence for statusmøder", "kadence", "text", "fx hver 14. dag, tirsdag kl. 10")}
            {felt("HubSpot-portal", "hubspotPortal", "text", "Link eller portal-id")}
            {felt("Projektmappe", "projektmappe", "text", "Link til drev")}
          </>
        ))}

        <div style={{ background: "#fff", border: RAMME, marginTop: 16 }}>
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid #F0F1F4",
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#9E9E9E",
            }}
          >
            Formål og forventet resultat
          </div>
          <div style={{ padding: 20 }}>
            {omraade("", "formaal", "Beskriv i tre til fem linjer, hvad kunden vil opnå, og hvordan succes ser ud efter forløbet.")}
          </div>
        </div>

        {boks("Kundens udgangspunkt", (
          <>
            {omraade("Aktive marketingkanaler", "udgangspunktKanaler")}
            {omraade("Antal leads pr. måned i dag", "udgangspunktLeadsPrMaaned")}
            {omraade("Salgsproces i dag", "udgangspunktSalgsproces")}
            <label style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 13, fontWeight: 500, color: "#4A4A4A" }}>
              CRM-modenhed
              <select
                value={v.udgangspunktCrmModenhed}
                onChange={(e) => saet("udgangspunktCrmModenhed", e.target.value)}
                style={{ height: 40, border: "1px solid #DDE0E5", background: "#fff", padding: "0 10px", fontSize: 14, fontFamily: "inherit" }}
              >
                <option value="">Ikke valgt</option>
                {CRM_MODENHED.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            {omraade("Automatisering i dag", "udgangspunktAutomatisering")}
            {omraade("Hvor tabes leads og omsætning i dag", "udgangspunktHvorTabes")}
          </>
        ))}

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <Knap
            tekst={pending ? "Opretter…" : "Opret kundeprojekt"}
            variant="primaer"
            onClick={opret}
            deaktiveret={pending}
          />
          <a
            href={laastKunde ? "/" : "/kundeprojekter"}
            style={{
              height: 34,
              padding: "0 14px",
              border: "1px solid #E1E4E9",
              background: "#fff",
              color: "#4A4A4A",
              fontSize: 13,
              display: "inline-flex",
              alignItems: "center",
              textDecoration: "none",
            }}
          >
            Annullér
          </a>
        </div>
      </div>
    </div>
  );
}
