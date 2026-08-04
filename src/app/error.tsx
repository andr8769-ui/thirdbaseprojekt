"use client";

import { useEffect } from "react";

// Vises hvis en server component kaster (typisk Neon cold start). Pæn dansk besked
// i appens design + 'Prøv igen', og ét automatisk reset()-forsøg efter 2 sekunder.
// Ingen stacktrace eller digest til brugeren.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    const t = setTimeout(() => reset(), 2000);
    return () => clearTimeout(t);
  }, [reset]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F7F8F9",
        color: "#181818",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "var(--font-instrument-sans), system-ui, sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420, background: "#fff", border: "1px solid #E6E8EC", padding: 32, textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 22 }}>
          <div style={{ display: "grid", gridTemplateColumns: "9px 9px", gap: 3, transform: "rotate(45deg)" }}>
            <div style={{ width: 9, height: 9, background: "#FF442B" }} />
            <div style={{ width: 9, height: 9, background: "#FF442B" }} />
            <div style={{ width: 9, height: 9, background: "#FF442B" }} />
            <div style={{ width: 9, height: 9, background: "#FF442B" }} />
          </div>
          <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>thirdbase</span>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span className="tb-spinner" />
          <span style={{ fontSize: 18, fontWeight: 600 }}>Databasen var i dvale</span>
        </div>
        <div style={{ fontSize: 14, color: "#6E6E6E", lineHeight: 1.6 }}>
          Vi vækker den og prøver igen automatisk om et øjeblik. Det tager typisk et par sekunder.
        </div>
        <button
          onClick={() => reset()}
          style={{
            marginTop: 22,
            height: 44,
            padding: "0 22px",
            border: 0,
            background: "#FF442B",
            color: "#fff",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Prøv igen
        </button>
      </div>
    </div>
  );
}
