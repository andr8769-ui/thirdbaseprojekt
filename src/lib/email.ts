// ------------------------------------------------------------------
// E-mail-transport med to backends:
//   1) Resend  — hvis RESEND_API_KEY er sat (foretrukket, via REST API).
//   2) SMTP    — ellers nodemailer, hvis SMTP_HOST/PORT/USER/PASS er sat
//                (virker med Google Workspace: smtp.gmail.com:465 + app-password).
// Er ingen af dem sat: log en advarsel og fortsæt.
//
// sendEmail kaster ALDRIG — e-mail er fire-and-forget og må aldrig få en
// action eller request til at fejle.
// ------------------------------------------------------------------

export const EMAIL_FROM =
  process.env.EMAIL_FROM || "thirdbase Projektstyring <noreply@thirdbase.dk>";

export type MailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

let advarselVist = false;

function harSmtp(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);
}

/** Sender en e-mail via den konfigurerede backend. Returnerer true hvis sendt. */
export async function sendEmail(mail: MailInput): Promise<boolean> {
  try {
    if (process.env.RESEND_API_KEY) {
      return await sendViaResend(mail);
    }
    if (harSmtp()) {
      return await sendViaSmtp(mail);
    }
    if (!advarselVist) {
      advarselVist = true;
      console.warn(
        "[email] Hverken RESEND_API_KEY eller SMTP_* er sat — e-mails sendes ikke (in-app-notifikationer virker stadig).",
      );
    }
    return false;
  } catch (err) {
    // Fejl må aldrig boble op.
    console.error("[email] Kunne ikke sende e-mail:", (err as Error)?.message || err);
    return false;
  }
}

async function sendViaResend(mail: MailInput): Promise<boolean> {
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
    console.error("[email] Resend svarede", res.status, body.slice(0, 200));
    return false;
  }
  return true;
}

async function sendViaSmtp(mail: MailInput): Promise<boolean> {
  const nodemailer = (await import("nodemailer")).default;
  const port = Number(process.env.SMTP_PORT);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // 465 = implicit TLS (Google Workspace)
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transport.sendMail({
    from: EMAIL_FROM,
    to: mail.to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });
  return true;
}
