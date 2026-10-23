import type { PaymentProvider } from "./types";
import { sandboxProvider } from "./sandbox";

/**
 * Registered providers. The gateway approved for the Palestinian merchant of record is added
 * here as a new adapter implementing PaymentProvider (hosted checkout + signed webhooks + refunds).
 * Until one is configured, card payment is shown to customers as "awaiting configuration".
 */
const providers: Record<string, PaymentProvider> = {
  sandbox: sandboxProvider,
};

export function getProvider(key?: string | null): PaymentProvider | null {
  const k = key ?? process.env.PAYMENT_PROVIDER ?? "";
  const p = providers[k];
  return p && p.isConfigured() ? p : null;
}

export function activeProviderInfo() {
  const key = process.env.PAYMENT_PROVIDER || "";
  const p = providers[key];
  return {
    key: key || null,
    label: p?.label ?? null,
    known: !!p,
    configured: !!p?.isConfigured(),
    sandbox: !!p?.sandbox,
  };
}
