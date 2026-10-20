// A word to the clinic when a consultation comes in, if Railway's variables say where to send it:
//   NOTIFY_WEBHOOK_URL  Slack, Discord, Google Chat or Telegram (…/sendMessage?chat_id=…) incoming webhook
//   NOTIFY_EMAIL        who gets the mail (commas for more), sent through SMTP_URL (smtps://user:pass@host:465)
//                       or SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS; SMTP_FROM if the sender differs
// The message names only the kind, the part of the face and the time, never the name or phone number: those stay
// behind the admin's log-in.
const WEBHOOK = process.env.NOTIFY_WEBHOOK_URL || "";
const TO = process.env.NOTIFY_EMAIL || "";
const SMTP = process.env.SMTP_URL || (process.env.SMTP_HOST ? {
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: (Number(process.env.SMTP_PORT) || 465) === 465,
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || "" } : undefined,
} : null);

export const channels = () => ({ webhook: !!WEBHOOK, email: !!(TO && SMTP) });

let mailer = null;
async function mail() {
  if (mailer) return mailer;
  const { default: nodemailer } = await import("nodemailer");
  mailer = nodemailer.createTransport(SMTP);
  return mailer;
}

const KST = (d) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);

export async function send(subject, text) {
  const out = [];
  if (WEBHOOK) {
    try {
      const r = await fetch(WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: `${subject}\n${text}`, content: `${subject}\n${text}` }), signal: AbortSignal.timeout(8000) });
      out.push(r.ok ? "webhook ok" : `webhook ${r.status}`);
    } catch (e) { out.push(`webhook: ${e.message}`); }
  }
  if (TO && SMTP) {
    try {
      const m = await mail();
      await m.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER || undefined, to: TO, subject, text });
      out.push("email ok");
    } catch (e) { out.push(`email: ${e.message}`); }
  }
  return out;
}

export function newConsult(c, base, kindLabel) {
  if (!WEBHOOK && !(TO && SMTP)) return;
  const what = [kindLabel, c.interest].filter(Boolean).join(" · ");
  const subject = `[해운누리] 새 상담 신청 · ${what}`;
  const text = `${KST(new Date(c.created_at || Date.now()))} 접수${c.channel ? ` · 유입 ${c.channel}` : ""}\n관리자에서 확인: ${base}/admin/consults/${c.id}`;
  send(subject, text).then((r) => r.some((x) => !/ok$/.test(x)) && console.error("notify:", r.join(", "))).catch((e) => console.error("notify:", e.message));
}
