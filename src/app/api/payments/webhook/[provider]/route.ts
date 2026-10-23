import type { Prisma } from "@prisma/client";
import { fail, json } from "@/lib/api";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { getProvider } from "@/lib/services/payments";
import { applyPaymentResult } from "@/lib/services/orders";

/**
 * Provider → DELLA payment callbacks.
 * 1. Signature verified over the raw body (constant-time HMAC).
 * 2. Event stored with a unique (provider, eventId) key → replays are no-ops (idempotent).
 * 3. Amount & currency must match the payment we initiated, or the event is rejected.
 * Card payments can ONLY become PAID through this path.
 */
export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: key } = await params;
  const provider = getProvider(key);
  if (!provider) return fail("NOT_FOUND", 404);

  const raw = await req.text();
  if (raw.length > 64_000) return fail("PAYLOAD_TOO_LARGE", 413);
  const event = await provider.verifyWebhook(raw, req.headers);
  if (!event) {
    await audit({ actorType: "PROVIDER", action: "payment.webhook.rejected", entity: "PaymentEvent", data: { provider: key, reason: "bad_signature" } });
    return fail("INVALID_SIGNATURE", 401);
  }

  const existing = await db.paymentEvent.findUnique({ where: { provider_eventId: { provider: key, eventId: event.eventId } } });
  if (existing?.processedAt) return json({ ok: true, duplicate: true });
  const stored = existing ?? await db.paymentEvent.create({
    data: { provider: key, eventId: event.eventId, type: event.type, payload: event.raw as Prisma.InputJsonValue, verified: true },
  });

  const payment = await db.payment.findUnique({ where: { providerRef: event.providerRef } });
  if (!payment) return fail("PAYMENT_NOT_FOUND", 404);
  if (event.status === "PAID" && (event.amount !== payment.amount || event.currency.toUpperCase() !== payment.currency)) {
    await audit({ actorType: "PROVIDER", action: "payment.webhook.amount_mismatch", entity: "Payment", entityId: payment.id, data: { expected: payment.amount, got: event.amount, currency: event.currency } });
    return fail("AMOUNT_MISMATCH", 400);
  }

  if (event.status !== "PENDING") {
    await applyPaymentResult(payment.orderId, event.status, { type: "PROVIDER", id: key }, `${key}:${event.eventId}`);
  }
  await db.paymentEvent.update({ where: { id: stored.id }, data: { processedAt: new Date() } });
  await audit({ actorType: "PROVIDER", action: `payment.${event.status.toLowerCase()}`, entity: "Payment", entityId: payment.id, data: { eventId: event.eventId } });
  return json({ ok: true });
}
