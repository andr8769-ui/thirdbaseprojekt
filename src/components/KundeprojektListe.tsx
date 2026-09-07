"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sletKundeprojekt } from "@/app/kundeprojekter/actions";
import { baseEtiket } from "@/lib/thirdbase-template";
import type { KundeprojektKortDTO } from "@/lib/kundeprojekt-types";
import { Sidehoved, StatusMaerkat, Knap, Besked, RAMME } from "@/components/KundeprojektFelter";

export default function KundeprojektListe({
  projekter,
  erAdministrator,
}: {
  projekter: KundeprojektKortDTO[];
  erAdministrator: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [fejl, setFejl] = useState<string | null>(null);
  const [slet, setSlet] = useState<KundeprojektKortDTO | null>(null);

  function bekraeftSlet() {
    if (!slet) return;
    const id = slet.id;
    setFejl(null);
    start(async () => {
      const res = await sletKundeprojekt(id);
      if (res.ok) {
        setSlet(null);
        router.refresh();
      } else {
        setFejl(res.reason || "Kundeprojektet kunne ikke slettes.");
      }
    });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F7F8F9", color: "#181818" }}>
      <div className="tb-pad" style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 80px" }}>
        <Sidehoved />

        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>Kundeprojekter</div>
            <div style={{ fontSize: 15, color: "#6E6E6E", marginTop: 8, maxWidth: "62ch", lineHeight: 1.6 }}>
              Forløb bygget på The Thirdbase Model med fire baser. Hver base skal nås, før den næste giver mening.
            </div>
          </div>
          {erAdministrator && (
            <a
              href="/kundeprojekter/nyt"
              style={{
                height: 40,
                padding: "0 18px",
                background: "#FF442B",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                textDecoration: "none",
              }}
            >
              Nyt kundeprojekt
            </a>
          )}
        </div>

        {fejl && (
          <div style={{ marginTop: 20 }}>
            <Besked tekst={fejl} type="fejl" />
          </div>
        )}

        {projekter.length === 0 ? (
          <div style={{ marginTop: 32, background: "#fff", border: RAMME, padding: "56px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Ingen kundeprojekter endnu</div>
            <div style={{ fontSize: 14, color: "#6E6E6E", marginTop: 8 }}>
              {erAdministrator
                ? "Opret det første forløb ud fra skabelonen."
                : "En administrator opretter det første forløb."}
            </div>
          </div>
        ) : (
          <div className="tb-kort-grid" style={{ marginTop: 32 }}>
            {projekter.map((p) => {
              const procent =
                p.antalTjekpunkter > 0 ? Math.round((p.antalAfkrydsede / p.antalTjekpunkter) * 100) : 0;
              return (
                <div key={p.id} style={{ background: "#fff", border: RAMME, borderTop: "3px solid #FF442B", padding: 20 }}>
                  <a
                    href={`/kundeprojekter/${p.id}`}
                    style={{ fontSize: 17, fontWeight: 600, color: "#181818", textDecoration: "none" }}
                  >
                    {p.kundeNavn}
                  </a>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <StatusMaerkat status={p.samletStatus} />
                    <span style={{ fontSize: 12, color: "#6E6E6E" }}>
                      Nuværende {p.nuvaerendeBase === "Home" ? "Home" : baseEtiket(Number(p.nuvaerendeBase) || 1)}
                    </span>
                  </div>

                  <div style={{ fontSize: 12, color: "#9E9E9E", marginTop: 14 }}>
                    Tjeklister {p.antalAfkrydsede} af {p.antalTjekpunkter}
                  </div>
                  <div style={{ display: "flex", height: 8, background: "#F0F1F4", marginTop: 6 }}>
                    <div style={{ width: procent + "%", background: "#16A34A" }} />
                  </div>

                  <div style={{ fontSize: 12.5, color: "#6E6E6E", marginTop: 14, lineHeight: 1.7 }}>
                    <div>Projektansvarlig {p.projektansvarligNavn || "ikke angivet"}</div>
                    <div>
                      Periode {p.projektstart || "ikke sat"} til {p.forventetAfslutning || "ikke sat"}
                    </div>
                  </div>

                  {erAdministrator && (
                    <div style={{ marginTop: 16 }}>
                      <Knap tekst="Slet" variant="fare" onClick={() => setSlet(p)} deaktiveret={pending} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {slet && (
        <div
          onClick={() => !pending && setSlet(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(24,24,24,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 50,
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", border: RAMME, width: "100%", maxWidth: 460, padding: 28 }}>
            <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>Slet kundeprojekt</div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: "#4A4A4A", marginTop: 14 }}>
              Du er ved at slette forløbet for <strong>{slet.kundeNavn}</strong>. Alle baser, tjeklister, KPI'er,
              risici, beslutninger og statusmøder slettes permanent.
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: "#B4291A", marginTop: 12 }}>
              Handlingen kan ikke fortrydes.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
              <Knap tekst="Annullér" onClick={() => setSlet(null)} deaktiveret={pending} />
              <Knap tekst={pending ? "Sletter…" : "Slet forløbet"} variant="primaer" onClick={bekraeftSlet} deaktiveret={pending} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
