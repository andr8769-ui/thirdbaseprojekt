// ------------------------------------------------------------------
// Ét sted for notifikationer: createNotification() skriver BÅDE en in-app
// notifikation til databasen OG sender en e-mail til modtageren.
//
// Regler:
//  - Send aldrig til brugeren om brugerens egne handlinger (recipient === actor)
//    MEDMINDRE altidNotificer er sat. Tildeling bruger altidNotificer, så man også
//    får besked når man sætter sig selv (eller bliver sat) på en opgave.
//  - Respektér modtagerens emailNotifications-flag (kun e-mailen slås fra).
//  - E-mail er fire-and-forget: fejl må aldrig få en action/request til at fejle.
//  - Hvert forsøg logges med [notifikation] så det kan følges i Vercel-loggen.
// ------------------------------------------------------------------
import { prisma } from "@/lib/prisma";
import { sendEmailDetailed } from "@/lib/email";
import { appUrl } from "@/lib/appUrl";

export type NotifyInput = {
  recipientId: string;
  actor: { id: string; navn: string };
  text: string; // overskrift — vises både in-app og i mailen
  color: string;
  taskId?: string | null;
  taskName?: string | null;
  customerName?: string | null;
  time?: string;
  /** Notificér også selvom modtageren selv udførte handlingen (bruges ved tildeling). */
  altidNotificer?: boolean;
};

export async function createNotification(n: NotifyInput): Promise<void> {
  // Egne handlinger giver normalt ingen besked — men tildeling skal altid igennem,
  // så man får mail også når man selv sætter sig på (eller bliver sat på) en opgave.
  if (n.recipientId === n.actor.id && !n.altidNotificer) {
    console.log(`[notifikation] sprunget over: modtager === afsender (${n.recipientId}) — "${n.text}"`);
    return;
  }

  // 1) In-app notifikation i DB.
  try {
    await prisma.notification.create({
      data: {
        userId: n.recipientId,
        text: n.text,
        time: n.time || "for et øjeblik siden",
        color: n.color,
        taskId: n.taskId ?? null,
      },
    });
  } catch (err) {
    console.error("[notifications] kunne ikke oprette in-app notifikation:", (err as Error)?.message || err);
    return;
  }

  // 2) E-mail (fire-and-forget — må aldrig kaste videre).
  try {
    const modtager = await prisma.user.findUnique({
      where: { id: n.recipientId },
      select: { email: true, name: true, emailNotifications: true },
    });
    if (!modtager?.email) {
      console.warn(`[notifikation] ingen mail sendt: brugeren ${n.recipientId} har ingen e-mailadresse.`);
      return;
    }
    if (modtager.emailNotifications === false) {
      console.warn(
        `[notifikation] ingen mail sendt til ${modtager.email}: e-mail-notifikationer er slået FRA for brugeren (kan slås til under /indstillinger).`,
      );
      return;
    }

    const mail = buildMail({
      recipientName: modtager.name,
      actorName: n.actor.navn,
      text: n.text,
      taskName: n.taskName ?? null,
      customerName: n.customerName ?? null,
      taskId: n.taskId ?? null,
    });
    const res = await sendEmailDetailed({ to: modtager.email, ...mail });
    if (res.ok) {
      console.log(`[notifikation] mail SENDT til ${modtager.email} via ${res.transport} (fra ${res.from}) — "${n.text}"`);
    } else {
      console.error(
        `[notifikation] mail FEJLEDE til ${modtager.email} via ${res.transport} (fra ${res.from}): ${res.error}`,
      );
    }
  } catch (err) {
    console.error("[notifikation] e-mail fejlede (ignoreret):", (err as Error)?.message || err);
  }
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildMail(input: {
  recipientName: string;
  actorName: string;
  text: string;
  taskName: string | null;
  customerName: string | null;
  taskId: string | null;
}): { subject: string; html: string; text: string } {
  const link = input.taskId ? `${appUrl()}/?task=${encodeURIComponent(input.taskId)}` : appUrl();
  const fornavn = input.recipientName.split(" ")[0] || input.recipientName;

  const subject = input.text;

  const metaLinjer: string[] = [];
  if (input.taskName) metaLinjer.push(`Opgave: ${input.taskName}`);
  if (input.customerName) metaLinjer.push(`Kunde: ${input.customerName}`);
  metaLinjer.push(`Udført af: ${input.actorName}`);

  const html = `<!doctype html>
<html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${esc(subject)}</title></head>
<body style="margin:0;background:#F7F8F9;font-family:'Instrument Sans',system-ui,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#181818;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
      <span style="display:inline-block;width:12px;height:12px;background:#FF442B;transform:rotate(45deg);"></span>
      <span style="font-size:17px;font-weight:600;letter-spacing:-0.01em;color:#181818;">thirdbase</span>
      <span style="font-size:12px;color:#9E9E9E;">· Projektstyring</span>
    </div>
    <div style="background:#ffffff;border:1px solid #E6E8EC;padding:28px;">
      <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#9E9E9E;margin-bottom:14px;">Ny aktivitet</div>
      <div style="font-size:19px;font-weight:600;line-height:1.35;color:#181818;">${esc(input.text)}</div>
      <div style="margin-top:18px;font-size:14px;line-height:1.7;color:#4A4A4A;">
        ${metaLinjer.map((l) => `<div>${esc(l)}</div>`).join("")}
      </div>
      <a href="${esc(link)}" style="display:inline-block;margin-top:24px;background:#FF442B;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 22px;">Åbn i Projektstyring</a>
    </div>
    <div style="margin-top:20px;font-size:12px;color:#9E9E9E;line-height:1.6;">
      Du modtager denne mail, fordi du er tilknyttet thirdbase Projektstyring.
      Du kan slå mails fra under <a href="${esc(appUrl())}/indstillinger" style="color:#3355FF;">Indstillinger</a>.
    </div>
  </div>
</body></html>`;

  const text = [
    `Hej ${fornavn}`,
    "",
    input.text,
    "",
    ...metaLinjer,
    "",
    `Åbn i Projektstyring: ${link}`,
    "",
    `Slå mails fra: ${appUrl()}/indstillinger`,
  ].join("\n");

  return { subject, html, text };
}
