// ------------------------------------------------------------------
// Den ENE nye notifikation i kundeskabelonen: når en base godkendes,
// får projektansvarlig besked på mail.
//
// Genbruger den eksisterende transport i lib/email.ts (Resend eller SMTP)
// og den kanoniske URL fra lib/appUrl.ts. Ingen eksisterende mails røres.
// ------------------------------------------------------------------
import { sendEmailDetailed } from "@/lib/email";
import { appUrl } from "@/lib/appUrl";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export type BaseGodkendtMail = {
  til: string;
  modtagerNavn: string;
  kundeNavn: string;
  baseEtiket: string; // fx "Base 2" eller "Home"
  baseNavn: string; // fx "Sales Optimization"
  godkendtAf: string;
  godkendtDato: string;
  projektId: string;
};

/**
 * Sender besked om at en base er godkendt. Fire-and-forget som de øvrige
 * notifikationer, så en mailfejl aldrig vælter handlingen. Hvert forsøg
 * logges med praefikset [kundeprojekt] så det kan følges i Vercel-loggen.
 */
export async function sendBaseGodkendtMail(input: BaseGodkendtMail): Promise<void> {
  try {
    const link = `${appUrl()}/kundeprojekter/${encodeURIComponent(input.projektId)}`;
    const fornavn = input.modtagerNavn.split(" ")[0] || input.modtagerNavn;
    const overskrift = `${input.baseEtiket} er godkendt hos ${input.kundeNavn}`;

    const html = `<!doctype html>
<html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${esc(overskrift)}</title></head>
<body style="margin:0;background:#F7F8F9;font-family:'Instrument Sans',system-ui,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#181818;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
      <span style="display:inline-block;width:12px;height:12px;background:#FF442B;transform:rotate(45deg);"></span>
      <span style="font-size:17px;font-weight:600;letter-spacing:-0.01em;color:#181818;">thirdbase</span>
      <span style="font-size:12px;color:#9E9E9E;">· Projektstyring</span>
    </div>
    <div style="background:#ffffff;border:1px solid #E6E8EC;border-top:3px solid #16A34A;padding:28px;">
      <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#9E9E9E;margin-bottom:14px;">Base godkendt</div>
      <div style="font-size:19px;font-weight:600;line-height:1.35;color:#181818;">${esc(overskrift)}</div>
      <div style="margin-top:18px;font-size:14px;line-height:1.7;color:#4A4A4A;">
        <div>Kunde: ${esc(input.kundeNavn)}</div>
        <div>Base: ${esc(input.baseEtiket)} · ${esc(input.baseNavn)}</div>
        <div>Godkendt af: ${esc(input.godkendtAf)}</div>
        <div>Dato: ${esc(input.godkendtDato)}</div>
      </div>
      <a href="${esc(link)}" style="display:inline-block;margin-top:24px;background:#FF442B;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 22px;">Åbn kundeprojektet</a>
    </div>
    <div style="margin-top:20px;font-size:12px;color:#9E9E9E;line-height:1.6;">
      Du modtager denne mail, fordi du er projektansvarlig på forløbet.
    </div>
  </div>
</body></html>`;

    const text = [
      `Hej ${fornavn}`,
      "",
      overskrift,
      "",
      `Kunde: ${input.kundeNavn}`,
      `Base: ${input.baseEtiket} · ${input.baseNavn}`,
      `Godkendt af: ${input.godkendtAf}`,
      `Dato: ${input.godkendtDato}`,
      "",
      `Åbn kundeprojektet: ${link}`,
    ].join("\n");

    const res = await sendEmailDetailed({ to: input.til, subject: overskrift, html, text });
    if (res.ok) {
      console.log(`[kundeprojekt] base-godkendt mail SENDT til ${input.til} via ${res.transport} — "${overskrift}"`);
    } else {
      console.error(`[kundeprojekt] base-godkendt mail FEJLEDE til ${input.til} via ${res.transport}: ${res.error}`);
    }
  } catch (err) {
    console.error("[kundeprojekt] base-godkendt mail fejlede (ignoreret):", (err as Error)?.message || err);
  }
}
