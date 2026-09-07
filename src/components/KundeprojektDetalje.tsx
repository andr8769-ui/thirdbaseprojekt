"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  opdaterStamdata,
  opdaterAfdaekning,
  opdaterStep,
  opdaterKpi,
  opdaterKanal,
  opdaterFase,
  opdaterScoring,
  opdaterAutomatisering,
  opdaterEjerskab,
  saetTjekpunkt,
  opdaterBaseFelt,
  saetBaseStatus,
  godkendBase,
  tilfoejRisiko,
  opdaterRisiko,
  sletRisiko,
  tilfoejBeslutning,
  opdaterBeslutning,
  tilfoejAendring,
  opdaterAendring,
  tilfoejReview,
  opdaterReview,
  tilfoejStatusmoede,
  opdaterStatusmoede,
  tilfoejMoedeSkridt,
  opdaterMoedeSkridt,
  type Resultat,
} from "@/app/kundeprojekter/actions";
import {
  BASER,
  BASE_VALG,
  CRM_MODENHED,
  LEAD_SCORING_TYPER,
  RISIKO_STATUS,
  SKABELON_FODNOTE,
  baseEtiket,
  skabelonBase,
} from "@/lib/thirdbase-template";
import { beregnRetning } from "@/lib/kundeprojekt-data";
import type { KundeprojektDTO, BaseDTO } from "@/lib/kundeprojekt-types";
import {
  Sidehoved,
  StatusMaerkat,
  StatusVaelger,
  GemFelt,
  Knap,
  Besked,
  Etiket,
  Kort,
  Tabel,
  Raekke,
  RAMME,
  LINJE,
} from "@/components/KundeprojektFelter";

type Fane = "afdaekning" | "base1" | "base2" | "base3" | "home" | "kpi" | "risici" | "beslutninger" | "moeder";

const FANER: { key: Fane; navn: string }[] = [
  { key: "afdaekning", navn: "Afdækning" },
  { key: "base1", navn: "Base 1" },
  { key: "base2", navn: "Base 2" },
  { key: "base3", navn: "Base 3" },
  { key: "home", navn: "Home" },
  { key: "kpi", navn: "KPI-overblik" },
  { key: "risici", navn: "Risici" },
  { key: "beslutninger", navn: "Beslutninger" },
  { key: "moeder", navn: "Statusmøder" },
];

const BASE_ACCENT: Record<number, string> = { 1: "#FF442B", 2: "#3355FF", 3: "#7B61FF", 4: "#16A34A" };

export default function KundeprojektDetalje({ projekt }: { projekt: KundeprojektDTO }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [fane, setFane] = useState<Fane>("afdaekning");
  const [fejl, setFejl] = useState<string | null>(null);
  const [kvittering, setKvittering] = useState<string | null>(null);

  /** Kører en action og viser serverens begrundelse, hvis den afviser. */
  function kald(fn: () => Promise<Resultat>, okBesked?: string) {
    setFejl(null);
    setKvittering(null);
    start(async () => {
      try {
        const res = await fn();
        if (!res.ok) {
          setFejl(res.reason || "Ændringen kunne ikke gemmes.");
          return;
        }
        if (okBesked) setKvittering(okBesked);
        router.refresh();
      } catch {
        setFejl("Ændringen kunne ikke gemmes. Prøv igen.");
      }
    });
  }

  const base = (n: number) => projekt.baser.find((b) => b.nummer === n);

  // Antal manglende tjekpunkter i en given base, brugt til gate-teksten.
  const mangler = (n: number) => {
    const b = base(n);
    if (!b) return 0;
    return b.tjekliste.filter((t) => !t.afkrydset).length;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F7F8F9", color: "#181818" }}>
      <div className="tb-pad" style={{ maxWidth: 1180, margin: "0 auto", padding: "48px 24px 80px" }}>
        <Sidehoved />

        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <a href="/kundeprojekter" style={{ fontSize: 13, color: "#6E6E6E" }}>
              ← Alle kundeprojekter
            </a>
            <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em", marginTop: 8 }}>
              {projekt.kundeNavn}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <StatusMaerkat status={projekt.samletStatus} />
              <span style={{ fontSize: 13, color: "#6E6E6E" }}>
                Nuværende {projekt.nuvaerendeBase === "Home" ? "Home" : baseEtiket(Number(projekt.nuvaerendeBase) || 1)}
              </span>
            </div>
          </div>
        </div>

        {/* Stamdata */}
        <div style={{ marginTop: 28 }}>{renderStamdata()}</div>

        {/* Faner */}
        <div
          className="tb-scroll"
          style={{
            display: "flex",
            gap: 4,
            marginTop: 28,
            borderBottom: RAMME,
            overflowX: "auto",
            background: "#fff",
            paddingLeft: 4,
          }}
        >
          {FANER.map((f) => {
            const aktiv = fane === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFane(f.key)}
                style={{
                  background: "transparent",
                  border: 0,
                  borderBottom: "2px solid " + (aktiv ? "#FF442B" : "transparent"),
                  padding: "14px 14px",
                  fontSize: 14,
                  fontWeight: aktiv ? 600 : 400,
                  color: aktiv ? "#181818" : "#6E6E6E",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  fontFamily: "inherit",
                }}
              >
                {f.navn}
              </button>
            );
          })}
        </div>

        {(fejl || kvittering) && (
          <div style={{ marginTop: 20 }}>
            <Besked tekst={fejl || kvittering || ""} type={fejl ? "fejl" : "ok"} />
          </div>
        )}

        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          {fane === "afdaekning" && renderAfdaekning()}
          {fane === "base1" && renderBase(1)}
          {fane === "base2" && renderBase(2)}
          {fane === "base3" && renderBase(3)}
          {fane === "home" && renderBase(4)}
          {fane === "kpi" && renderKpiOverblik()}
          {fane === "risici" && renderRisici()}
          {fane === "beslutninger" && renderBeslutninger()}
          {fane === "moeder" && renderMoeder()}
        </div>

        <div style={{ marginTop: 40, fontSize: 12.5, color: "#9E9E9E", textAlign: "center" }}>{SKABELON_FODNOTE}</div>
      </div>
    </div>
  );

  // ================================================================
  // Sektion 0 · Stamdata
  // ================================================================
  function renderStamdata() {
    const raekke = (label: string, felt: string, vaerdi: string, type?: "text" | "date", flerLinjer?: boolean) => (
      <div key={felt}>
        <Etiket tekst={label} style={{ marginBottom: 6 }} />
        <GemFelt
          vaerdi={vaerdi}
          type={type}
          flerLinjer={flerLinjer}
          onGem={(v) => kald(() => opdaterStamdata(projekt.id, felt, v))}
          deaktiveret={pending}
        />
      </div>
    );

    return (
      <Kort titel="Projektstamdata" accent="#181818">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {raekke("CVR", "cvr", projekt.cvr)}
          {raekke("Kontaktperson", "kontaktpersonNavn", projekt.kontaktpersonNavn)}
          {raekke("Titel", "kontaktpersonTitel", projekt.kontaktpersonTitel)}
          {raekke("Mail", "kontaktpersonMail", projekt.kontaktpersonMail)}
          {raekke("Telefon", "kontaktpersonTelefon", projekt.kontaktpersonTelefon)}
          {raekke("Øvrige deltagere", "deltagere", projekt.deltagere)}
          {raekke("Projektstart", "projektstart", projekt.projektstart, "date")}
          {raekke("Forventet afslutning", "forventetAfslutning", projekt.forventetAfslutning, "date")}
          {raekke("Kadence for statusmøder", "kadence", projekt.kadence)}
          {raekke("HubSpot-portal", "hubspotPortal", projekt.hubspotPortal)}
          {raekke("Projektmappe", "projektmappe", projekt.projektmappe)}

          <div>
            <Etiket tekst="Nuværende base" style={{ marginBottom: 6 }} />
            <select
              value={projekt.nuvaerendeBase}
              disabled={pending}
              onChange={(e) => kald(() => opdaterStamdata(projekt.id, "nuvaerendeBase", e.target.value))}
              style={{ width: "100%", height: 32, border: "1px solid #E1E4E9", background: "#fff", fontSize: 13, fontFamily: "inherit" }}
            >
              {BASE_VALG.map((b) => (
                <option key={b} value={b}>
                  {b === "Home" ? "Home" : `Base ${b}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Etiket tekst="Samlet status" style={{ marginBottom: 6 }} />
            <StatusVaelger
              vaerdi={projekt.samletStatus}
              deaktiveret={pending}
              onSkift={(v) => kald(() => opdaterStamdata(projekt.id, "samletStatus", v))}
            />
          </div>

          <div>
            <Etiket tekst="Projektansvarlig" style={{ marginBottom: 6 }} />
            <div style={{ fontSize: 13, padding: "6px 0", color: "#4A4A4A" }}>
              {projekt.projektansvarligNavn || "ikke angivet"}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <Etiket tekst="Formål og forventet resultat" style={{ marginBottom: 6 }} />
          <GemFelt
            vaerdi={projekt.formaal}
            flerLinjer
            deaktiveret={pending}
            placeholder="Hvad vil kunden opnå, og hvordan ser succes ud efter forløbet"
            onGem={(v) => kald(() => opdaterStamdata(projekt.id, "formaal", v))}
          />
        </div>

        <div style={{ marginTop: 24 }}>
          <Etiket tekst="Kundens udgangspunkt" style={{ marginBottom: 10 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            {raekke("Aktive marketingkanaler", "udgangspunktKanaler", projekt.udgangspunktKanaler, "text", true)}
            {raekke("Antal leads pr. måned i dag", "udgangspunktLeadsPrMaaned", projekt.udgangspunktLeadsPrMaaned, "text", true)}
            {raekke("Salgsproces i dag", "udgangspunktSalgsproces", projekt.udgangspunktSalgsproces, "text", true)}
            <div>
              <Etiket tekst="CRM-modenhed" style={{ marginBottom: 6 }} />
              <select
                value={projekt.udgangspunktCrmModenhed}
                disabled={pending}
                onChange={(e) => kald(() => opdaterStamdata(projekt.id, "udgangspunktCrmModenhed", e.target.value))}
                style={{ width: "100%", height: 32, border: "1px solid #E1E4E9", background: "#fff", fontSize: 13, fontFamily: "inherit" }}
              >
                <option value="">Ikke valgt</option>
                {CRM_MODENHED.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            {raekke("Automatisering i dag", "udgangspunktAutomatisering", projekt.udgangspunktAutomatisering, "text", true)}
            {raekke("Hvor tabes leads og omsætning i dag", "udgangspunktHvorTabes", projekt.udgangspunktHvorTabes, "text", true)}
          </div>
        </div>
      </Kort>
    );
  }

  // ================================================================
  // 1 · Afdækning
  // ================================================================
  function renderAfdaekning() {
    const K = "60px minmax(280px,2fr) 150px 140px 150px minmax(200px,1.5fr)";
    return (
      <>
        <Kort
          titel="Afdækning"
          beskrivelse="Afdækningen kortlægger nuværende kanaler, pipeline og data, før arbejdet i baserne starter."
          accent="#9E9E9E"
        >
          <Tabel minBredde={1020}>
            <Raekke kolonner={K} hoved>
              <div>#</div>
              <div>Aktivitet</div>
              <div>Ejer</div>
              <div>Deadline</div>
              <div>Status</div>
              <div>Noter</div>
            </Raekke>
            {projekt.afdaekning.map((a) => (
              <Raekke key={a.id} kolonner={K}>
                <div style={{ fontWeight: 600, color: "#6E6E6E" }}>{a.kode}</div>
                <div style={{ lineHeight: 1.5 }}>{a.aktivitet}</div>
                <div>
                  <GemFelt vaerdi={a.ejer} deaktiveret={pending} onGem={(v) => kald(() => opdaterAfdaekning(a.id, "ejer", v))} />
                </div>
                <div>
                  <GemFelt vaerdi={a.deadline} type="date" deaktiveret={pending} onGem={(v) => kald(() => opdaterAfdaekning(a.id, "deadline", v))} />
                </div>
                <div>
                  <StatusVaelger vaerdi={a.status} deaktiveret={pending} onSkift={(v) => kald(() => opdaterAfdaekning(a.id, "status", v))} />
                </div>
                <div>
                  <GemFelt vaerdi={a.noter} deaktiveret={pending} onGem={(v) => kald(() => opdaterAfdaekning(a.id, "noter", v))} />
                </div>
              </Raekke>
            ))}
          </Tabel>
        </Kort>

        <Kort titel="Vigtigste fund fra afdækningen" accent="#9E9E9E">
          <GemFelt
            vaerdi={projekt.vigtigsteFund}
            flerLinjer
            deaktiveret={pending}
            placeholder="Skriv de vigtigste fund, ét pr. linje"
            onGem={(v) => kald(() => opdaterStamdata(projekt.id, "vigtigsteFund", v))}
          />
        </Kort>
      </>
    );
  }

  // ================================================================
  // Baserne
  // ================================================================
  function renderBase(nummer: number) {
    const b = base(nummer);
    const skabelon = skabelonBase(nummer);
    if (!b || !skabelon) return <Besked tekst="Basen findes ikke på dette projekt." type="fejl" />;

    const accent = BASE_ACCENT[nummer];
    const forrigeMangler = nummer > 1 ? mangler(nummer - 1) : 0;
    const gateBlokerer = nummer > 1 && forrigeMangler > 0;

    const K_STEP = "60px minmax(280px,2fr) minmax(200px,1.5fr) 130px 140px 150px";

    return (
      <>
        <Kort titel={skabelon.overskrift} beskrivelse={skabelon.maal} accent={accent}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {skabelon.fokusomraader.map((f) => (
              <span key={f} style={{ fontSize: 12, padding: "5px 10px", background: "#F7F8F9", border: LINJE, color: "#4A4A4A" }}>
                {f}
              </span>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <div>
              <Etiket tekst="Status for basen" style={{ marginBottom: 6 }} />
              <StatusVaelger vaerdi={b.status} deaktiveret={pending} onSkift={(v) => kald(() => saetBaseStatus(b.id, v))} />
            </div>
            <div>
              <Etiket tekst="Ansvarlig" style={{ marginBottom: 6 }} />
              <GemFelt vaerdi={b.ansvarlig} deaktiveret={pending} onGem={(v) => kald(() => opdaterBaseFelt(b.id, "ansvarlig", v))} />
            </div>
            <div>
              <Etiket tekst="Startdato" style={{ marginBottom: 6 }} />
              <GemFelt vaerdi={b.startdato} type="date" deaktiveret={pending} onGem={(v) => kald(() => opdaterBaseFelt(b.id, "startdato", v))} />
            </div>
            {skabelon.harMaaldato && (
              <div>
                <Etiket tekst="Måldato for basen" style={{ marginBottom: 6 }} />
                <GemFelt vaerdi={b.maaldato} type="date" deaktiveret={pending} onGem={(v) => kald(() => opdaterBaseFelt(b.id, "maaldato", v))} />
              </div>
            )}
          </div>

          {gateBlokerer && (
            <div style={{ marginTop: 18 }}>
              <Besked
                tekst={`${baseEtiket(nummer)} kan ikke markeres som Færdig eller godkendes endnu. Der mangler ${forrigeMangler} punkter i tjeklisten for ${baseEtiket(nummer - 1)}.`}
                type="fejl"
              />
            </div>
          )}

          <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {b.godkendtDato ? (
              <div style={{ fontSize: 13.5, color: "#12813C", fontWeight: 600 }}>
                {baseEtiket(nummer)} godkendt {b.godkendtDato} af {b.godkendtAfNavn || "ukendt"}
              </div>
            ) : (
              <Knap
                tekst="Godkend basen"
                variant="primaer"
                deaktiveret={pending}
                titel="Sender besked til projektansvarlig"
                onClick={() => kald(() => godkendBase(b.id), `${baseEtiket(nummer)} er godkendt. Projektansvarlig har fået besked.`)}
              />
            )}
          </div>
        </Kort>

        <Kort titel="Steps" accent={accent}>
          <Tabel minBredde={1060}>
            <Raekke kolonner={K_STEP} hoved>
              <div>#</div>
              <div>Step</div>
              <div>Konkrete aktiviteter</div>
              <div>Ejer</div>
              <div>Deadline</div>
              <div>Status</div>
            </Raekke>
            {b.steps.map((s) => (
              <Raekke key={s.id} kolonner={K_STEP}>
                <div style={{ fontWeight: 600, color: "#6E6E6E" }}>{s.kode}</div>
                <div style={{ lineHeight: 1.5 }}>
                  <div style={{ fontWeight: 500 }}>{s.titel}</div>
                  {s.beskrivelse && <div style={{ color: "#6E6E6E", marginTop: 4 }}>{s.beskrivelse}</div>}
                </div>
                <div>
                  <GemFelt vaerdi={s.aktiviteter} flerLinjer deaktiveret={pending} onGem={(v) => kald(() => opdaterStep(s.id, "aktiviteter", v))} />
                </div>
                <div>
                  <GemFelt vaerdi={s.ejer} deaktiveret={pending} onGem={(v) => kald(() => opdaterStep(s.id, "ejer", v))} />
                </div>
                <div>
                  <GemFelt vaerdi={s.deadline} type="date" deaktiveret={pending} onGem={(v) => kald(() => opdaterStep(s.id, "deadline", v))} />
                </div>
                <div>
                  <StatusVaelger vaerdi={s.status} deaktiveret={pending} onSkift={(v) => kald(() => opdaterStep(s.id, "status", v))} />
                </div>
              </Raekke>
            ))}
          </Tabel>
        </Kort>

        <Kort
          titel={skabelon.tjeklisteOverskrift}
          beskrivelse={
            nummer < 4
              ? `Alle fem punkter skal være afkrydset, før ${baseEtiket(nummer + 1)} kan markeres som Færdig eller godkendes.`
              : undefined
          }
          accent={accent}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {b.tjekliste.map((t) => (
              <label
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 12px",
                  borderBottom: LINJE,
                  cursor: pending ? "wait" : "pointer",
                  minHeight: 44,
                }}
              >
                <input
                  type="checkbox"
                  checked={t.afkrydset}
                  disabled={pending}
                  onChange={(e) => kald(() => saetTjekpunkt(t.id, e.target.checked))}
                  style={{ width: 17, height: 17, accentColor: "#16A34A", flex: "none", cursor: "inherit" }}
                />
                <span style={{ fontSize: 14, flex: 1, color: t.afkrydset ? "#6E6E6E" : "#181818" }}>{t.tekst}</span>
                {t.afkrydset && (
                  <span style={{ fontSize: 12, color: "#9E9E9E", whiteSpace: "nowrap" }}>
                    {t.dato} · {t.afkrydsetAf || "ukendt"}
                  </span>
                )}
              </label>
            ))}
          </div>
        </Kort>

        <Kort titel="KPI'er" accent={accent}>
          {renderKpiTabel(b)}
        </Kort>

        {nummer === 1 && renderKanaler(b, accent)}
        {nummer === 2 && renderFaser(b, accent)}
        {nummer === 2 && renderScoring(b, accent)}
        {nummer === 3 && renderAutomatiseringer(b, accent)}
        {nummer === 4 && renderEjerskab(accent)}
        {nummer === 4 && renderAendringslog(accent)}
        {nummer === 4 && renderReviews(accent)}

        <div style={{ background: "#fff", border: RAMME, borderLeft: `3px solid ${accent}`, padding: "16px 20px" }}>
          <Etiket tekst="Resultat når basen er nået" />
          <div style={{ fontSize: 14, color: "#4A4A4A", marginTop: 8, lineHeight: 1.6, textWrap: "pretty" }}>
            {skabelon.resultat}
          </div>
        </div>
      </>
    );
  }

  function renderKpiTabel(b: BaseDTO) {
    const K = "minmax(220px,1.4fr) minmax(200px,1.4fr) 110px 110px 110px 140px 150px";
    return (
      <Tabel minBredde={1100}>
        <Raekke kolonner={K} hoved>
          <div>KPI</div>
          <div>Hvad den viser</div>
          <div>Baseline</div>
          <div>Mål</div>
          <div>Aktuel</div>
          <div>Måledato</div>
          <div>Kilde</div>
        </Raekke>
        {b.kpier.map((k) => (
          <Raekke key={k.id} kolonner={K}>
            <div style={{ fontWeight: 500, lineHeight: 1.5 }}>{k.navn}</div>
            <div style={{ color: "#6E6E6E", lineHeight: 1.5 }}>{k.beskrivelse}</div>
            <div>
              <GemFelt vaerdi={k.baseline} deaktiveret={pending} onGem={(v) => kald(() => opdaterKpi(k.id, "baseline", v))} />
            </div>
            <div>
              <GemFelt vaerdi={k.maal} deaktiveret={pending} onGem={(v) => kald(() => opdaterKpi(k.id, "maal", v))} />
            </div>
            <div>
              <GemFelt vaerdi={k.aktuel} deaktiveret={pending} onGem={(v) => kald(() => opdaterKpi(k.id, "aktuel", v))} />
            </div>
            <div>
              <GemFelt vaerdi={k.maaledato} type="date" deaktiveret={pending} onGem={(v) => kald(() => opdaterKpi(k.id, "maaledato", v))} />
            </div>
            <div>
              <GemFelt vaerdi={k.kilde} deaktiveret={pending} onGem={(v) => kald(() => opdaterKpi(k.id, "kilde", v))} />
            </div>
          </Raekke>
        ))}
      </Tabel>
    );
  }

  function renderKanaler(b: BaseDTO, accent: string) {
    const K = "minmax(180px,1.2fr) 90px 130px minmax(180px,1.4fr) 130px 150px";
    return (
      <Kort titel="Valgte kanaler" accent={accent}>
        <Tabel minBredde={1000}>
          <Raekke kolonner={K} hoved>
            <div>Kanal</div>
            <div>Aktiv</div>
            <div>Budget pr. md.</div>
            <div>Landingsside</div>
            <div>Sporing sat op</div>
            <div>Ansvarlig</div>
          </Raekke>
          {b.kanaler.map((k) => (
            <Raekke key={k.id} kolonner={K}>
              <div style={{ fontWeight: 500 }}>{k.kanal}</div>
              <div>
                <input
                  type="checkbox"
                  checked={k.aktiv}
                  disabled={pending}
                  onChange={(e) => kald(() => opdaterKanal(k.id, "aktiv", e.target.checked))}
                  style={{ width: 17, height: 17, accentColor: "#16A34A" }}
                />
              </div>
              <div>
                <GemFelt vaerdi={k.budget} deaktiveret={pending} onGem={(v) => kald(() => opdaterKanal(k.id, "budget", v))} />
              </div>
              <div>
                <GemFelt vaerdi={k.landingsside} deaktiveret={pending} placeholder="URL" onGem={(v) => kald(() => opdaterKanal(k.id, "landingsside", v))} />
              </div>
              <div>
                <input
                  type="checkbox"
                  checked={k.sporingSatOp}
                  disabled={pending}
                  onChange={(e) => kald(() => opdaterKanal(k.id, "sporingSatOp", e.target.checked))}
                  style={{ width: 17, height: 17, accentColor: "#16A34A" }}
                />
              </div>
              <div>
                <GemFelt vaerdi={k.ansvarlig} deaktiveret={pending} onGem={(v) => kald(() => opdaterKanal(k.id, "ansvarlig", v))} />
              </div>
            </Raekke>
          ))}
        </Tabel>
      </Kort>
    );
  }

  function renderFaser(b: BaseDTO, accent: string) {
    const K = "70px minmax(160px,1fr) minmax(220px,1.6fr) 150px minmax(160px,1.2fr)";
    return (
      <Kort titel="Pipelinens faser" accent={accent}>
        <Tabel minBredde={1000}>
          <Raekke kolonner={K} hoved>
            <div>Trin</div>
            <div>Fase</div>
            <div>Kriterie for at rykke videre</div>
            <div>Ejer</div>
            <div>Automatisering</div>
          </Raekke>
          {b.faser.map((f) => (
            <Raekke key={f.id} kolonner={K}>
              <div style={{ fontWeight: 600, color: "#6E6E6E" }}>{f.trin}</div>
              <div>
                <GemFelt vaerdi={f.fase} deaktiveret={pending} onGem={(v) => kald(() => opdaterFase(f.id, "fase", v))} />
              </div>
              <div>
                <GemFelt vaerdi={f.kriterie} deaktiveret={pending} onGem={(v) => kald(() => opdaterFase(f.id, "kriterie", v))} />
              </div>
              <div>
                <GemFelt vaerdi={f.ejer} deaktiveret={pending} onGem={(v) => kald(() => opdaterFase(f.id, "ejer", v))} />
              </div>
              <div>
                <GemFelt vaerdi={f.automatisering} deaktiveret={pending} onGem={(v) => kald(() => opdaterFase(f.id, "automatisering", v))} />
              </div>
            </Raekke>
          ))}
        </Tabel>
      </Kort>
    );
  }

  function renderScoring(b: BaseDTO, accent: string) {
    const K = "minmax(220px,1.6fr) 150px 110px minmax(180px,1.4fr)";
    return (
      <Kort titel="Lead scoring" accent={accent}>
        <Tabel minBredde={900}>
          <Raekke kolonner={K} hoved>
            <div>Kriterie</div>
            <div>Type</div>
            <div>Point</div>
            <div>Note</div>
          </Raekke>
          {b.scoringRegler.map((r) => (
            <Raekke key={r.id} kolonner={K}>
              <div>
                <GemFelt vaerdi={r.kriterie} deaktiveret={pending} placeholder="fx besøg på prisside" onGem={(v) => kald(() => opdaterScoring(r.id, "kriterie", v))} />
              </div>
              <div>
                <select
                  value={r.type}
                  disabled={pending}
                  onChange={(e) => kald(() => opdaterScoring(r.id, "type", e.target.value))}
                  style={{ width: "100%", height: 32, border: "1px solid #E1E4E9", background: "#fff", fontSize: 13, fontFamily: "inherit" }}
                >
                  {LEAD_SCORING_TYPER.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <GemFelt vaerdi={r.point} deaktiveret={pending} placeholder="+10" onGem={(v) => kald(() => opdaterScoring(r.id, "point", v))} />
              </div>
              <div>
                <GemFelt vaerdi={r.note} deaktiveret={pending} onGem={(v) => kald(() => opdaterScoring(r.id, "note", v))} />
              </div>
            </Raekke>
          ))}
        </Tabel>
      </Kort>
    );
  }

  function renderAutomatiseringer(b: BaseDTO, accent: string) {
    const K = "minmax(180px,1.3fr) minmax(150px,1.1fr) minmax(150px,1.1fr) minmax(150px,1.1fr) 150px 140px";
    return (
      <Kort titel="Automatiseringer" accent={accent}>
        <Tabel minBredde={1080}>
          <Raekke kolonner={K} hoved>
            <div>Automatisering</div>
            <div>Trigger</div>
            <div>Handling</div>
            <div>Værktøj</div>
            <div>Status</div>
            <div>Ejer</div>
          </Raekke>
          {b.automatiseringer.map((a) => (
            <Raekke key={a.id} kolonner={K}>
              <div>
                <GemFelt vaerdi={a.navn} deaktiveret={pending} placeholder="fx formular til CRM" onGem={(v) => kald(() => opdaterAutomatisering(a.id, "navn", v))} />
              </div>
              <div>
                <GemFelt vaerdi={a.trigger} deaktiveret={pending} onGem={(v) => kald(() => opdaterAutomatisering(a.id, "trigger", v))} />
              </div>
              <div>
                <GemFelt vaerdi={a.handling} deaktiveret={pending} onGem={(v) => kald(() => opdaterAutomatisering(a.id, "handling", v))} />
              </div>
              <div>
                <GemFelt vaerdi={a.vaerktoej} deaktiveret={pending} placeholder="HubSpot workflow" onGem={(v) => kald(() => opdaterAutomatisering(a.id, "vaerktoej", v))} />
              </div>
              <div>
                <StatusVaelger vaerdi={a.status} deaktiveret={pending} onSkift={(v) => kald(() => opdaterAutomatisering(a.id, "status", v))} />
              </div>
              <div>
                <GemFelt vaerdi={a.ejer} deaktiveret={pending} onGem={(v) => kald(() => opdaterAutomatisering(a.id, "ejer", v))} />
              </div>
            </Raekke>
          ))}
        </Tabel>
      </Kort>
    );
  }

  function renderEjerskab(accent: string) {
    const K = "minmax(220px,1.4fr) minmax(180px,1.2fr) minmax(180px,1.2fr) minmax(160px,1fr)";
    return (
      <Kort titel="Ejerskab og kadence" accent={accent}>
        <Tabel minBredde={950}>
          <Raekke kolonner={K} hoved>
            <div>Område</div>
            <div>Ejer hos kunden</div>
            <div>Ejer hos Thirdbase</div>
            <div>Gennemgang hvor ofte</div>
          </Raekke>
          {projekt.ejerskab.map((e) => (
            <Raekke key={e.id} kolonner={K}>
              <div style={{ fontWeight: 500 }}>{e.omraade}</div>
              <div>
                <GemFelt vaerdi={e.ejerHosKunden} deaktiveret={pending} onGem={(v) => kald(() => opdaterEjerskab(e.id, "ejerHosKunden", v))} />
              </div>
              <div>
                <GemFelt vaerdi={e.ejerHosThirdbase} deaktiveret={pending} onGem={(v) => kald(() => opdaterEjerskab(e.id, "ejerHosThirdbase", v))} />
              </div>
              <div>
                <GemFelt vaerdi={e.gennemgang} deaktiveret={pending} onGem={(v) => kald(() => opdaterEjerskab(e.id, "gennemgang", v))} />
              </div>
            </Raekke>
          ))}
        </Tabel>
      </Kort>
    );
  }

  function renderAendringslog(accent: string) {
    const K = "90px 140px minmax(200px,1.4fr) minmax(180px,1.2fr) 150px minmax(160px,1fr)";
    return (
      <Kort titel="Ændringslog" beskrivelse="Versionering af hvad der ændres og hvorfor, så læring bevares." accent={accent}>
        <Tabel minBredde={1080}>
          <Raekke kolonner={K} hoved>
            <div>Version</div>
            <div>Dato</div>
            <div>Hvad blev ændret</div>
            <div>Hvorfor</div>
            <div>Ændret af</div>
            <div>Resultat</div>
          </Raekke>
          {projekt.aendringer.map((a) => (
            <Raekke key={a.id} kolonner={K}>
              <div>
                <GemFelt vaerdi={a.version} deaktiveret={pending} onGem={(v) => kald(() => opdaterAendring(a.id, "version", v))} />
              </div>
              <div>
                <GemFelt vaerdi={a.dato} type="date" deaktiveret={pending} onGem={(v) => kald(() => opdaterAendring(a.id, "dato", v))} />
              </div>
              <div>
                <GemFelt vaerdi={a.hvadBlevAendret} deaktiveret={pending} onGem={(v) => kald(() => opdaterAendring(a.id, "hvadBlevAendret", v))} />
              </div>
              <div>
                <GemFelt vaerdi={a.hvorfor} deaktiveret={pending} onGem={(v) => kald(() => opdaterAendring(a.id, "hvorfor", v))} />
              </div>
              <div>
                <GemFelt vaerdi={a.aendretAf} deaktiveret={pending} onGem={(v) => kald(() => opdaterAendring(a.id, "aendretAf", v))} />
              </div>
              <div>
                <GemFelt vaerdi={a.resultat} deaktiveret={pending} onGem={(v) => kald(() => opdaterAendring(a.id, "resultat", v))} />
              </div>
            </Raekke>
          ))}
        </Tabel>
        <div style={{ marginTop: 14 }}>
          <Knap tekst="Tilføj version" deaktiveret={pending} onClick={() => kald(() => tilfoejAendring(projekt.id))} />
        </div>
      </Kort>
    );
  }

  function renderReviews(accent: string) {
    const K = "140px minmax(180px,1.2fr) minmax(200px,1.4fr) minmax(200px,1.4fr) 140px";
    return (
      <Kort titel="Performance reviews" accent={accent}>
        {projekt.reviews.length === 0 ? (
          <div style={{ fontSize: 13.5, color: "#9E9E9E" }}>Ingen reviews afholdt endnu.</div>
        ) : (
          <Tabel minBredde={1000}>
            <Raekke kolonner={K} hoved>
              <div>Dato</div>
              <div>Deltagere</div>
              <div>Vigtigste fund</div>
              <div>Besluttede optimeringer</div>
              <div>Næste review</div>
            </Raekke>
            {projekt.reviews.map((r) => (
              <Raekke key={r.id} kolonner={K}>
                <div>
                  <GemFelt vaerdi={r.dato} type="date" deaktiveret={pending} onGem={(v) => kald(() => opdaterReview(r.id, "dato", v))} />
                </div>
                <div>
                  <GemFelt vaerdi={r.deltagere} deaktiveret={pending} onGem={(v) => kald(() => opdaterReview(r.id, "deltagere", v))} />
                </div>
                <div>
                  <GemFelt vaerdi={r.vigtigsteFund} flerLinjer deaktiveret={pending} onGem={(v) => kald(() => opdaterReview(r.id, "vigtigsteFund", v))} />
                </div>
                <div>
                  <GemFelt vaerdi={r.besluttedeOptimeringer} flerLinjer deaktiveret={pending} onGem={(v) => kald(() => opdaterReview(r.id, "besluttedeOptimeringer", v))} />
                </div>
                <div>
                  <GemFelt vaerdi={r.naesteReview} type="date" deaktiveret={pending} onGem={(v) => kald(() => opdaterReview(r.id, "naesteReview", v))} />
                </div>
              </Raekke>
            ))}
          </Tabel>
        )}
        <div style={{ marginTop: 14 }}>
          <Knap tekst="Tilføj review" deaktiveret={pending} onClick={() => kald(() => tilfoejReview(projekt.id))} />
        </div>
      </Kort>
    );
  }

  // ================================================================
  // 6 · Samlet KPI-overblik
  // ================================================================
  function renderKpiOverblik() {
    const K = "90px minmax(260px,2fr) 120px 120px 120px 110px";
    const raekker = projekt.baser.flatMap((b) =>
      b.kpier.map((k) => ({
        id: k.id,
        base: baseEtiket(b.nummer),
        navn: k.navn,
        baseline: k.baseline,
        maal: k.maal,
        aktuel: k.aktuel,
        retning: beregnRetning(k.baseline, k.aktuel),
      })),
    );

    const farve = (r: string) => (r === "↑" ? "#16A34A" : r === "↓" ? "#FF442B" : "#9E9E9E");

    return (
      <Kort
        titel="Samlet KPI-overblik"
        beskrivelse="Udfyldes ved hver gennemgang, så udviklingen på tværs af baserne kan følges ét sted. Retningen beregnes ud fra baseline og aktuel værdi."
        accent="#3355FF"
      >
        <Tabel minBredde={960}>
          <Raekke kolonner={K} hoved>
            <div>Base</div>
            <div>KPI</div>
            <div>Baseline</div>
            <div>Mål</div>
            <div>Aktuel</div>
            <div>Retning</div>
          </Raekke>
          {raekker.map((r) => (
            <Raekke key={r.id} kolonner={K}>
              <div style={{ color: "#6E6E6E", fontWeight: 600 }}>{r.base}</div>
              <div style={{ lineHeight: 1.5 }}>{r.navn}</div>
              <div style={{ color: "#6E6E6E" }}>{r.baseline || "—"}</div>
              <div style={{ color: "#6E6E6E" }}>{r.maal || "—"}</div>
              <div style={{ fontWeight: 600 }}>{r.aktuel || "—"}</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: farve(r.retning) }}>{r.retning}</div>
            </Raekke>
          ))}
        </Tabel>
        <div style={{ fontSize: 12.5, color: "#9E9E9E", marginTop: 12 }}>
          ↑ er fremgang, ↓ er tilbagegang og → er uændret. Værdier uden tal vises som uændret.
        </div>
      </Kort>
    );
  }

  // ================================================================
  // 7 · Risici og blokeringer
  // ================================================================
  function renderRisici() {
    const K = "60px minmax(200px,1.5fr) 100px minmax(160px,1.2fr) minmax(160px,1.2fr) 130px 120px 90px";
    return (
      <Kort titel="Risici og blokeringer" accent="#FF442B">
        {projekt.risici.length === 0 ? (
          <div style={{ fontSize: 13.5, color: "#9E9E9E" }}>Ingen risici registreret endnu.</div>
        ) : (
          <Tabel minBredde={1200}>
            <Raekke kolonner={K} hoved>
              <div>#</div>
              <div>Risiko eller blokering</div>
              <div>Base</div>
              <div>Konsekvens</div>
              <div>Håndtering</div>
              <div>Ejer</div>
              <div>Status</div>
              <div></div>
            </Raekke>
            {projekt.risici.map((r) => (
              <Raekke key={r.id} kolonner={K}>
                <div style={{ fontWeight: 600, color: "#6E6E6E" }}>{r.kode}</div>
                <div>
                  <GemFelt vaerdi={r.beskrivelse} deaktiveret={pending} placeholder="fx manglende adgang til HubSpot" onGem={(v) => kald(() => opdaterRisiko(r.id, "beskrivelse", v))} />
                </div>
                <div>
                  <GemFelt vaerdi={r.base} deaktiveret={pending} onGem={(v) => kald(() => opdaterRisiko(r.id, "base", v))} />
                </div>
                <div>
                  <GemFelt vaerdi={r.konsekvens} deaktiveret={pending} onGem={(v) => kald(() => opdaterRisiko(r.id, "konsekvens", v))} />
                </div>
                <div>
                  <GemFelt vaerdi={r.haandtering} deaktiveret={pending} onGem={(v) => kald(() => opdaterRisiko(r.id, "haandtering", v))} />
                </div>
                <div>
                  <GemFelt vaerdi={r.ejer} deaktiveret={pending} onGem={(v) => kald(() => opdaterRisiko(r.id, "ejer", v))} />
                </div>
                <div>
                  <select
                    value={r.status}
                    disabled={pending}
                    onChange={(e) => kald(() => opdaterRisiko(r.id, "status", e.target.value))}
                    style={{ width: "100%", height: 32, border: "1px solid #E1E4E9", background: "#fff", fontSize: 13, fontFamily: "inherit" }}
                  >
                    {RISIKO_STATUS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <button
                    onClick={() => kald(() => sletRisiko(r.id))}
                    disabled={pending}
                    title="Slet risiko"
                    style={{ border: "1px solid #F3C9C2", background: "#fff", color: "#B4291A", fontSize: 12.5, height: 30, padding: "0 8px", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Slet
                  </button>
                </div>
              </Raekke>
            ))}
          </Tabel>
        )}
        <div style={{ marginTop: 14 }}>
          <Knap tekst="Tilføj risiko" deaktiveret={pending} onClick={() => kald(() => tilfoejRisiko(projekt.id))} />
        </div>
      </Kort>
    );
  }

  // ================================================================
  // 8 · Beslutningslog
  // ================================================================
  function renderBeslutninger() {
    const K = "140px minmax(240px,1.6fr) minmax(220px,1.4fr) 160px";
    return (
      <Kort titel="Beslutningslog" accent="#7B61FF">
        {projekt.beslutninger.length === 0 ? (
          <div style={{ fontSize: 13.5, color: "#9E9E9E" }}>Ingen beslutninger registreret endnu.</div>
        ) : (
          <Tabel minBredde={900}>
            <Raekke kolonner={K} hoved>
              <div>Dato</div>
              <div>Beslutning</div>
              <div>Baggrund</div>
              <div>Besluttet af</div>
            </Raekke>
            {projekt.beslutninger.map((b) => (
              <Raekke key={b.id} kolonner={K}>
                <div>
                  <GemFelt vaerdi={b.dato} type="date" deaktiveret={pending} onGem={(v) => kald(() => opdaterBeslutning(b.id, "dato", v))} />
                </div>
                <div>
                  <GemFelt vaerdi={b.beslutning} flerLinjer deaktiveret={pending} onGem={(v) => kald(() => opdaterBeslutning(b.id, "beslutning", v))} />
                </div>
                <div>
                  <GemFelt vaerdi={b.baggrund} flerLinjer deaktiveret={pending} onGem={(v) => kald(() => opdaterBeslutning(b.id, "baggrund", v))} />
                </div>
                <div>
                  <GemFelt vaerdi={b.besluttetAf} deaktiveret={pending} onGem={(v) => kald(() => opdaterBeslutning(b.id, "besluttetAf", v))} />
                </div>
              </Raekke>
            ))}
          </Tabel>
        )}
        <div style={{ marginTop: 14 }}>
          <Knap tekst="Tilføj beslutning" deaktiveret={pending} onClick={() => kald(() => tilfoejBeslutning(projekt.id))} />
        </div>
      </Kort>
    );
  }

  // ================================================================
  // 9 · Statusmøder
  // ================================================================
  function renderMoeder() {
    const K_SKRIDT = "minmax(240px,2fr) minmax(160px,1fr) 150px";
    return (
      <>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Knap tekst="Nyt statusmøde" variant="primaer" deaktiveret={pending} onClick={() => kald(() => tilfoejStatusmoede(projekt.id))} />
        </div>

        {projekt.moeder.length === 0 && (
          <Kort titel="Statusmøder" accent="#3355FF">
            <div style={{ fontSize: 13.5, color: "#9E9E9E" }}>
              Ingen statusmøder endnu. Opret det første med knappen ovenfor.
            </div>
          </Kort>
        )}

        {projekt.moeder.map((m) => (
          <Kort key={m.id} titel={`Statusmøde ${m.dato || "uden dato"}`} accent="#3355FF">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <div>
                <Etiket tekst="Dato" style={{ marginBottom: 6 }} />
                <GemFelt vaerdi={m.dato} type="date" deaktiveret={pending} onGem={(v) => kald(() => opdaterStatusmoede(m.id, "dato", v))} />
              </div>
              <div>
                <Etiket tekst="Deltagere" style={{ marginBottom: 6 }} />
                <GemFelt vaerdi={m.deltagere} deaktiveret={pending} onGem={(v) => kald(() => opdaterStatusmoede(m.id, "deltagere", v))} />
              </div>
              <div>
                <Etiket tekst="Nuværende base" style={{ marginBottom: 6 }} />
                <select
                  value={m.nuvaerendeBase}
                  disabled={pending}
                  onChange={(e) => kald(() => opdaterStatusmoede(m.id, "nuvaerendeBase", e.target.value))}
                  style={{ width: "100%", height: 32, border: "1px solid #E1E4E9", background: "#fff", fontSize: 13, fontFamily: "inherit" }}
                >
                  <option value="">Ikke valgt</option>
                  {BASE_VALG.map((b) => (
                    <option key={b} value={b}>
                      {b === "Home" ? "Home" : `Base ${b}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Etiket tekst="Næste møde" style={{ marginBottom: 6 }} />
                <GemFelt vaerdi={m.naesteMoede} type="date" deaktiveret={pending} onGem={(v) => kald(() => opdaterStatusmoede(m.id, "naesteMoede", v))} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginTop: 20 }}>
              <div>
                <Etiket tekst="Siden sidst" style={{ marginBottom: 6 }} />
                <GemFelt vaerdi={m.sidenSidst} flerLinjer deaktiveret={pending} placeholder="Hvad er gennemført" onGem={(v) => kald(() => opdaterStatusmoede(m.id, "sidenSidst", v))} />
              </div>
              <div>
                <Etiket tekst="KPI-bevægelse" style={{ marginBottom: 6 }} />
                <GemFelt vaerdi={m.kpiBevaegelse} flerLinjer deaktiveret={pending} placeholder="Hvilke KPI'er har flyttet sig, og i hvilken retning" onGem={(v) => kald(() => opdaterStatusmoede(m.id, "kpiBevaegelse", v))} />
              </div>
              <div>
                <Etiket tekst="Blokeringer" style={{ marginBottom: 6 }} />
                <GemFelt vaerdi={m.blokeringer} flerLinjer deaktiveret={pending} placeholder="Hvad står i vejen" onGem={(v) => kald(() => opdaterStatusmoede(m.id, "blokeringer", v))} />
              </div>
              <div>
                <Etiket tekst="Beslutninger" style={{ marginBottom: 6 }} />
                <GemFelt vaerdi={m.beslutninger} flerLinjer deaktiveret={pending} placeholder="Hvad blev besluttet" onGem={(v) => kald(() => opdaterStatusmoede(m.id, "beslutninger", v))} />
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <Etiket tekst="Næste skridt" style={{ marginBottom: 10 }} />
              <Tabel minBredde={760}>
                <Raekke kolonner={K_SKRIDT} hoved>
                  <div>Opgave</div>
                  <div>Ejer</div>
                  <div>Deadline</div>
                </Raekke>
                {m.skridt.map((s) => (
                  <Raekke key={s.id} kolonner={K_SKRIDT}>
                    <div>
                      <GemFelt vaerdi={s.opgave} deaktiveret={pending} onGem={(v) => kald(() => opdaterMoedeSkridt(s.id, "opgave", v))} />
                    </div>
                    <div>
                      <GemFelt vaerdi={s.ejer} deaktiveret={pending} onGem={(v) => kald(() => opdaterMoedeSkridt(s.id, "ejer", v))} />
                    </div>
                    <div>
                      <GemFelt vaerdi={s.deadline} type="date" deaktiveret={pending} onGem={(v) => kald(() => opdaterMoedeSkridt(s.id, "deadline", v))} />
                    </div>
                  </Raekke>
                ))}
              </Tabel>
              <div style={{ marginTop: 12 }}>
                <Knap tekst="Tilføj skridt" deaktiveret={pending} onClick={() => kald(() => tilfoejMoedeSkridt(m.id))} />
              </div>
            </div>
          </Kort>
        ))}
      </>
    );
  }
}
