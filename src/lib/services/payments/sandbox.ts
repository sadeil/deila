import { randomUUID } from "node:crypto";
import type { PaymentProvider } from "./types";
import { verifySignedPayload } from "./hmac";
import { siteUrl } from "../../utils";

/**
 * SANDBOX provider for development and automated tests only. Hard-disabled in production.
 * It simulates a provider-hosted page (/pay/sandbox) and signed webhooks so the whole
 * server-side flow (initiation → signed callback → idempotent confirmation) can be tested.
 * No money moves and no card data is collected.
 */
export const sandboxProvider: PaymentProvider = {
  key: "sandbox",
  label: "Sandbox (test only)",
  sandbox: true,
  isConfigured: () => process.env.NODE_ENV !== "production" && !!process.env.SANDBOX_WEBHOOK_SECRET,
  async createCheckout({ orderNumber, amount }) {
    const providerRef = `sbx_${randomUUID()}`;
    const u = new URL(siteUrl("/pay/sandbox"));
    u.searchParams.set("ref", providerRef);
    u.searchParams.set("order", orderNumber);
    u.searchParams.set("amount", String(amount));
    return { redirectUrl: u.toString(), providerRef };
  },
  async verifyWebhook(rawBody, headers) {
    const secret = process.env.SANDBOX_WEBHOOK_SECRET;
    if (!secret || !verifySignedPayload(secret, rawBody, headers.get("x-sandbox-signature"))) return null;
    const e = JSON.parse(rawBody) as {
      id: string; type: string;
      data: { ref: string; status: "PAID" | "FAILED"; amount: number; currency: string };
    };
    return { eventId: e.id, type: e.type, providerRef: e.data.ref, status: e.data.status, amount: e.data.amount, currency: e.data.currency, raw: e };
  },
  async refund() {
    return { refundRef: `sbx_rf_${randomUUID()}` };
  },
};
