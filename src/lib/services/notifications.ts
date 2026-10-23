import { db } from "../db";

export type NotificationType =
  | "NEW_ORDER" | "ORDER_CONFIRMED" | "PAYMENT_CONFIRMED" | "PAYMENT_FAILED" | "ORDER_SHIPPED"
  | "ORDER_DELIVERED" | "ORDER_CANCELED" | "REFUND_PROCESSED" | "NEW_INQUIRY" | "LOW_STOCK" | "PASSWORD_RESET";

export const channelStatus = () => ({
  email: !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
  whatsapp: !!(process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_ID),
});

/** In-app notification for the admin team. */
export async function notifyAdmins(type: NotificationType, title: string, body: string, orderId?: string) {
  await db.notification.create({ data: { type, channel: "IN_APP", title, body, status: "UNREAD", orderId } });
}

/**
 * Customer-facing message. When a channel is not configured the record is stored
 * with status NOT_CONFIGURED — we never claim a message was sent when it was not.
 */
export async function notifyCustomer(
  type: NotificationType,
  to: { email?: string | null; phone?: string | null },
  title: string,
  body: string,
  orderId?: string,
) {
  const ch = channelStatus();
  const jobs: Promise<unknown>[] = [];
  if (to.email) jobs.push(deliver("EMAIL", ch.email, to.email, () => sendEmail(to.email!, title, body)));
  if (to.phone) jobs.push(deliver("WHATSAPP", ch.whatsapp, to.phone, () => sendWhatsApp(to.phone!, `${title}\n${body}`)));
  await Promise.all(jobs);

  async function deliver(channel: "EMAIL" | "WHATSAPP", configured: boolean, recipient: string, send: () => Promise<void>) {
    if (!configured) {
      await db.notification.create({ data: { type, channel, recipient, title, body, orderId, status: "NOT_CONFIGURED" } });
      return;
    }
    try {
      await send();
      await db.notification.create({ data: { type, channel, recipient, title, body, orderId, status: "SENT" } });
    } catch (e) {
      await db.notification.create({
        data: { type, channel, recipient, title, body, orderId, status: "FAILED", error: String(e).slice(0, 500) },
      });
    }
  }
}

async function sendEmail(to: string, subject: string, text: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text }),
  });
  if (!res.ok) throw new Error(`Email provider responded ${res.status}`);
}

async function sendWhatsApp(phone: string, text: string) {
  // WhatsApp Cloud API. Business-initiated messages outside the 24h window require
  // approved templates; configure those before enabling this channel.
  const intl = phone.replace(/^0/, "970");
  const res = await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: intl, type: "text", text: { body: text } }),
  });
  if (!res.ok) throw new Error(`WhatsApp provider responded ${res.status}`);
}
