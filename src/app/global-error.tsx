"use client";

import { useEffect } from "react";

// Fallback hvis selve root-layoutet kaster. Skal rendere sit eget <html>/<body>,
// så alt styling er inline. Samme danske besked + 'Prøv igen' + auto-reset efter 2s.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    const t = setTimeout(() => reset(), 2000);
    return () => clearTimeout(t);
  }, [reset]);

  return (
    <html lang="da">
      <body style={{ margin: 0, background: "#F7F8F9", color: "#181818", fontFamily: "system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" }}>
        <style>{"@keyframes tbspin{to{transform:rotate(360deg)}}"}</style>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ width: "100%", maxWidth: 420, background: "#fff", border: "1px solid #E6E8EC", padding: 32, textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 22 }}>
              <span style={{ display: "inline-block", width: 12, height: 12, background: "#FF442B", transform: "rotate(45deg)" }} />
              <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>thirdbase</span>
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid #E1E4E9", borderTopColor: "#FF442B", borderRadius: "50%", animation: "tbspin 0.6s linear infinite" }} />
              <span style={{ fontSize: 18, fontWeight: 600 }}>Databasen var i dvale</span>
            </div>
            <div style={{ fontSize: 14, color: "#6E6E6E", lineHeight: 1.6 }}>
              Vi vækker den og prøver igen automatisk om et øjeblik. Det tager typisk et par sekunder.
            </div>
            <button
              onClick={() => reset()}
              style={{ marginTop: 22, height: 44, padding: "0 22px", border: 0, background: "#FF442B", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
            >
              Prøv igen
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
