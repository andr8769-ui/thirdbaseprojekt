"use client";

// Små, delte byggeklodser til kundeprojekt-UI'et. Samme designtokens og
// inline styles som resten af appen, ingen nye afhængigheder.

import { useEffect, useState } from "react";
import { PROJEKT_STATUS, PROJEKT_STATUS_FARVE } from "@/lib/thirdbase-template";

export const RAMME = "1px solid #E6E8EC";
export const LINJE = "1px solid #F0F1F4";

/** Overskrift i det små, som resten af appen bruger. */
export function Etiket({ tekst, style }: { tekst: string; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        fontSize: 11,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "#9E9E9E",
        ...style,
      }}
    >
      {tekst}
    </div>
  );
}

/** Farvet statusmærkat. */
export function StatusMaerkat({ status }: { status: string }) {
  const farve = PROJEKT_STATUS_FARVE[status] || "#C4C7CE";
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 600,
        padding: "4px 9px",
        background: farve,
        color: status === "Ikke startet" ? "#181818" : "#FFFFFF",
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}

/**
 * Tekstfelt der gemmer ved blur, hvis værdien er ændret. Enter gemmer i et
 * enkeltlinjefelt, Escape fortryder. Samme adfærd som de øvrige inline
 * editorer i appen.
 */
export function GemFelt({
  vaerdi,
  onGem,
  placeholder,
  flerLinjer,
  type,
  bredde,
  deaktiveret,
}: {
  vaerdi: string;
  onGem: (v: string) => void;
  placeholder?: string;
  flerLinjer?: boolean;
  type?: "text" | "date";
  bredde?: number | string;
  deaktiveret?: boolean;
}) {
  const [v, setV] = useState(vaerdi);
  useEffect(() => setV(vaerdi), [vaerdi]);

  const stil: React.CSSProperties = {
    width: bredde ?? "100%",
    border: "1px solid #E1E4E9",
    background: deaktiveret ? "#F7F8F9" : "#fff",
    fontSize: 13,
    padding: "6px 8px",
    color: "#181818",
    fontFamily: "inherit",
    minWidth: 0,
  };

  const gem = () => {
    if (v !== vaerdi) onGem(v);
  };

  if (flerLinjer) {
    return (
      <textarea
        value={v}
        disabled={deaktiveret}
        onChange={(e) => setV(e.target.value)}
        onBlur={gem}
        onKeyDown={(e) => {
          if (e.key === "Escape") setV(vaerdi);
        }}
        placeholder={placeholder}
        rows={3}
        style={{ ...stil, resize: "vertical", lineHeight: 1.5 }}
      />
    );
  }

  return (
    <input
      type={type || "text"}
      value={v}
      disabled={deaktiveret}
      onChange={(e) => setV(e.target.value)}
      onBlur={gem}
      onKeyDown={(e) => {
        if (e.key === "Escape") setV(vaerdi);
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      placeholder={placeholder}
      style={stil}
    />
  );
}

/** Statusvælger med skabelonens fire værdier. */
export function StatusVaelger({
  vaerdi,
  onSkift,
  deaktiveret,
}: {
  vaerdi: string;
  onSkift: (v: string) => void;
  deaktiveret?: boolean;
}) {
  return (
    <select
      value={vaerdi}
      disabled={deaktiveret}
      onChange={(e) => onSkift(e.target.value)}
      style={{
        height: 30,
        border: "1px solid #E1E4E9",
        background: "#fff",
        fontSize: 13,
        padding: "0 6px",
        color: "#181818",
        fontFamily: "inherit",
      }}
    >
      {PROJEKT_STATUS.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}

/** Knap i appens eksisterende stil. */
export function Knap({
  tekst,
  onClick,
  variant,
  deaktiveret,
  titel,
}: {
  tekst: string;
  onClick: () => void;
  variant?: "primaer" | "sekundaer" | "fare";
  deaktiveret?: boolean;
  titel?: string;
}) {
  const v = variant || "sekundaer";
  const stil: React.CSSProperties =
    v === "primaer"
      ? { border: 0, background: "#FF442B", color: "#fff", fontWeight: 600 }
      : v === "fare"
        ? { border: "1px solid #F3C9C2", background: "#fff", color: "#B4291A" }
        : { border: "1px solid #E1E4E9", background: "#fff", color: "#3355FF" };
  return (
    <button
      onClick={onClick}
      disabled={deaktiveret}
      title={titel}
      style={{
        height: 34,
        padding: "0 14px",
        fontSize: 13,
        cursor: deaktiveret ? "wait" : "pointer",
        fontFamily: "inherit",
        ...stil,
      }}
    >
      {tekst}
    </button>
  );
}

/** Vandret scrollende ramme om brede tabeller, så siden ikke kan scrolles. */
export function Tabel({ children, minBredde }: { children: React.ReactNode; minBredde?: number }) {
  return (
    <div className="tb-scroll" style={{ overflowX: "auto", border: RAMME, background: "#fff" }}>
      <div style={{ minWidth: minBredde ?? 900 }}>{children}</div>
    </div>
  );
}

/** Række i en tabel med faste kolonnebredder. */
export function Raekke({
  kolonner,
  children,
  hoved,
}: {
  kolonner: string;
  children: React.ReactNode;
  hoved?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: kolonner,
        gap: 10,
        alignItems: hoved ? "center" : "start",
        padding: "10px 14px",
        borderBottom: LINJE,
        fontSize: hoved ? 11 : 13,
        letterSpacing: hoved ? "0.06em" : undefined,
        textTransform: hoved ? "uppercase" : undefined,
        color: hoved ? "#9E9E9E" : "#181818",
        background: hoved ? "#fff" : undefined,
      }}
    >
      {children}
    </div>
  );
}

/** Kort med overskrift, brugt til sektionerne. */
export function Kort({
  titel,
  beskrivelse,
  children,
  accent,
}: {
  titel: string;
  beskrivelse?: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div style={{ background: "#fff", border: RAMME, borderTop: `3px solid ${accent || "#181818"}`, padding: 24 }}>
      <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>{titel}</div>
      {beskrivelse && (
        <div style={{ fontSize: 14, color: "#6E6E6E", marginTop: 8, lineHeight: 1.6, textWrap: "pretty" }}>
          {beskrivelse}
        </div>
      )}
      <div style={{ marginTop: 18 }}>{children}</div>
    </div>
  );
}

/** Fejl eller kvittering, fx når gaten blokerer. */
export function Besked({ tekst, type }: { tekst: string; type: "fejl" | "ok" }) {
  const fejl = type === "fejl";
  return (
    <div
      style={{
        border: `1px solid ${fejl ? "#FFD7CF" : "#BBE7C8"}`,
        background: fejl ? "#FFF3F0" : "#F0FBF3",
        color: fejl ? "#B4291A" : "#12813C",
        fontSize: 13.5,
        lineHeight: 1.55,
        padding: "12px 14px",
      }}
    >
      {tekst}
    </div>
  );
}

/** Fælles sidehoved, magen til /brugere og /indstillinger. */
export function Sidehoved({ tilbageTekst }: { tilbageTekst?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
      <div style={{ display: "grid", gridTemplateColumns: "9px 9px", gap: 3, transform: "rotate(45deg)" }}>
        <div style={{ width: 9, height: 9, background: "#FF442B" }} />
        <div style={{ width: 9, height: 9, background: "#FF442B" }} />
        <div style={{ width: 9, height: 9, background: "#FF442B" }} />
        <div style={{ width: 9, height: 9, background: "#FF442B" }} />
      </div>
      <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>thirdbase</span>
      <a href="/" style={{ marginLeft: "auto", fontSize: 13, color: "#6E6E6E" }}>
        {tilbageTekst || "← Tilbage til projektstyring"}
      </a>
    </div>
  );
}
