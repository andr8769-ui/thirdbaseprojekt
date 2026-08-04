"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setEmailNotifications, sendTestEmail, type TestMailResultat } from "@/app/actions";

const TRANSPORT_LABEL: Record<string, string> = {
  resend: "Resend",
  smtp: "SMTP",
  none: "Ingen konfigureret",
};

export default function SettingsForm({
  navn,
  email,
  initial,
  isAdmin,
  transport,
  from,
}: {
  navn: string;
  email: string;
  initial: boolean;
  isAdmin: boolean;
  transport: string;
  from: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [on, setOn] = useState(initial);
  const [gemt, setGemt] = useState(false);

  const [testPending, startTest] = useTransition();
  const [testResultat, setTestResultat] = useState<TestMailResultat | null>(null);

  function toggle() {
    const next = !on;
    setOn(next);
    setGemt(false);
    startTransition(async () => {
      await setEmailNotifications(next);
      router.refresh();
      setGemt(true);
    });
  }

  function testmail() {
    setTestResultat(null);
    startTest(async () => {
      const res = await sendTestEmail();
      setTestResultat(res);
    });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F7F8F9", color: "#181818" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px 80px" }}>
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

        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>Indstillinger</div>
        <div style={{ fontSize: 15, color: "#6E6E6E", marginTop: 8 }}>
          {navn} · {email}
        </div>

        {/* Notifikationer */}
        <div style={{ background: "#fff", border: "1px solid #E6E8EC", marginTop: 28 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #F0F1F4", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9E9E9E" }}>
            Notifikationer
          </div>
          <div style={{ padding: "20px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 500 }}>E-mail-notifikationer</div>
              <div style={{ fontSize: 13, color: "#6E6E6E", marginTop: 4, lineHeight: 1.5 }}>
                Få en e-mail når du bliver nævnt, tildelt en opgave, eller når en opgave du følger opdateres.
                In-app-notifikationer vises altid.
              </div>
            </div>
            <button
              onClick={toggle}
              disabled={pending}
              role="switch"
              aria-checked={on}
              title={on ? "Slå fra" : "Slå til"}
              style={{
                width: 46,
                height: 26,
                flex: "none",
                border: 0,
                cursor: pending ? "wait" : "pointer",
                background: on ? "#16A34A" : "#C4C7CE",
                borderRadius: 999,
                position: "relative",
                transition: "background 120ms",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 3,
                  left: on ? 23 : 3,
                  width: 20,
                  height: 20,
                  background: "#fff",
                  borderRadius: "50%",
                  transition: "left 120ms",
                }}
              />
            </button>
          </div>
          {gemt && !pending && (
            <div style={{ padding: "0 20px 18px", fontSize: 13, color: "#16A34A" }}>
              Gemt — e-mails er {on ? "slået til" : "slået fra"}.
            </div>
          )}
        </div>

        {/* E-mail-transport (kun admin) */}
        {isAdmin && (
          <div style={{ background: "#fff", border: "1px solid #E6E8EC", marginTop: 16 }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #F0F1F4", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9E9E9E" }}>
              E-mail-transport (admin)
            </div>
            <div style={{ padding: "20px" }}>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: 14 }}>
                <div>
                  <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9E9E9E", marginBottom: 4 }}>Aktiv transport</div>
                  <div style={{ fontWeight: 600, color: transport === "none" ? "#B4291A" : "#181818" }}>
                    {TRANSPORT_LABEL[transport] || transport}
                  </div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9E9E9E", marginBottom: 4 }}>Afsender</div>
                  <div style={{ fontWeight: 500, wordBreak: "break-all" }}>{from}</div>
                </div>
              </div>

              <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 14 }}>
                <button
                  onClick={testmail}
                  disabled={testPending}
                  style={{
                    height: 40,
                    padding: "0 18px",
                    border: 0,
                    background: "#181818",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: testPending ? "wait" : "pointer",
                  }}
                >
                  {testPending ? "Sender…" : "Send testmail til mig selv"}
                </button>
                {transport === "none" && (
                  <span style={{ fontSize: 13, color: "#B4291A" }}>Ingen transport konfigureret.</span>
                )}
              </div>

              {testResultat && (
                <div
                  style={{
                    marginTop: 16,
                    border: "1px solid " + (testResultat.ok ? "#BBE7C8" : "#FFD7CF"),
                    background: testResultat.ok ? "#F0FBF3" : "#FFF3F0",
                    padding: "12px 14px",
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  {testResultat.ok ? (
                    <div style={{ color: "#12813C" }}>
                      Testmail sendt til <strong>{testResultat.to}</strong> via <strong>{TRANSPORT_LABEL[testResultat.transport] || testResultat.transport}</strong>.
                      Tjek din indbakke (og evt. spam).
                    </div>
                  ) : (
                    <div style={{ color: "#B4291A" }}>
                      <div style={{ fontWeight: 600 }}>Kunne ikke sende testmail.</div>
                      <div style={{ marginTop: 4, wordBreak: "break-word" }}>{testResultat.error}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
