// ------------------------------------------------------------------
// E-mail-transport med to backends:
//   1) Resend  — hvis RESEND_API_KEY er sat (foretrukket, via REST API).
//   2) SMTP    — ellers nodemailer, hvis SMTP_HOST/PORT/USER/PASS er sat
//                (virker med Google Workspace: smtp.gmail.com:465 + app-password).
// Er ingen af dem sat: log en advarsel og fortsæt.
//
// sendEmail kaster ALDRIG — e-mail er fire-and-forget og må aldrig få en
// action eller request til at fejle. sendEmailDetailed returnerer den konkrete
// transport-fejl (til testmail-diagnostik på /indstillinger).
// ------------------------------------------------------------------

export const EMAIL_FROM =
  process.env.EMAIL_FROM || "thirdbase Projektstyring <noreply@thirdbase.dk>";

export type Transport = "resend" | "smtp" | "none";

export type MailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendResult = { ok: boolean; transport: Transport; from: string; error?: string };

let advarselVist = false;

function harSmtp(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);
}

/** Hvilken transport er aktiv ud fra env. */
export function activeTransport(): Transport {
  if (process.env.RESEND_API_KEY) return "resend";
  if (harSmtp()) return "smtp";
  return "none";
}

function parseFrom(from: string): { name: string; address: string } {
  const m = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].replace(/^"|"$/g, "").trim(), address: m[2].trim() };
  return { name: "", address: from.trim() };
}

// Gmail/Workspace overskriver afsenderen, hvis From-adressen ikke matcher SMTP_USER.
// Behold visningsnavnet fra EMAIL_FROM, men brug SMTP_USER som adresse.
function smtpFrom(): string {
  const user = process.env.SMTP_USER || "";
  const { name, address } = parseFrom(EMAIL_FROM);
  if (user && address.toLowerCase() !== user.toLowerCase()) {
    return name ? `${name} <${user}>` : user;
  }
  return EMAIL_FROM;
}

/** Den afsenderadresse der reelt bruges med den aktive transport. */
export function effectiveFrom(): string {
  return activeTransport() === "smtp" ? smtpFrom() : EMAIL_FROM;
}

/** Sender en e-mail og returnerer et detaljeret resultat (kaster aldrig). */
export async function sendEmailDetailed(mail: MailInput): Promise<SendResult> {
  const transport = activeTransport();
  const from = effectiveFrom();
  try {
    if (transport === "resend") {
      await sendViaResend(mail);
      return { ok: true, transport, from };
    }
    if (transport === "smtp") {
      await sendViaSmtp(mail);
      return { ok: true, transport, from };
    }
    if (!advarselVist) {
      advarselVist = true;
      console.warn(
        "[email] Hverken RESEND_API_KEY eller SMTP_* er sat — e-mails sendes ikke (in-app-notifikationer virker stadig).",
      );
    }
    return { ok: false, transport, from, error: "Ingen mail-transport konfigureret (sæt RESEND_API_KEY eller SMTP_*)." };
  } catch (err) {
    const besked = (err as Error)?.message || String(err);
    console.error("[email] Kunne ikke sende e-mail:", besked);
    return { ok: false, transport, from, error: besked };
  }
}

/** Fire-and-forget-variant (bruges af notifikationer). Returnerer true hvis sendt. */
export async function sendEmail(mail: MailInput): Promise<boolean> {
  return (await sendEmailDetailed(mail)).ok;
}

async function sendViaResend(mail: MailInput): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [mail.to],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${body.slice(0, 300) || res.statusText}`);
  }
}

async function sendViaSmtp(mail: MailInput): Promise<void> {
  const nodemailer = (await import("nodemailer")).default;
  const port = Number(process.env.SMTP_PORT);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // 465 = implicit TLS (Google Workspace / Gmail)
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transport.sendMail({
    from: smtpFrom(), // skal matche SMTP_USER, ellers overskriver Gmail afsenderen
    to: mail.to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });
}
