export type ProviderPaymentStatus = "PAID" | "FAILED" | "PENDING";

export type VerifiedEvent = {
  eventId: string;
  type: string;
  providerRef: string;
  status: ProviderPaymentStatus;
  amount: number; // agorot
  currency: string;
  raw: unknown;
};

export interface PaymentProvider {
  key: string;
  label: string;
  /** True for non-production test providers. */
  sandbox: boolean;
  /** True only when every credential the provider needs is present. */
  isConfigured(): boolean;
  /** Server-side initiation. Returns a provider-hosted URL; card data never touches DELLA servers. */
  createCheckout(input: {
    orderId: string;
    orderNumber: string;
    amount: number;
    currency: string;
    returnUrl: string;
    cancelUrl: string;
    customer: { name: string; phone: string; email?: string | null };
    idempotencyKey: string;
  }): Promise<{ redirectUrl: string; providerRef: string }>;
  /** Verify the signature over the RAW body. Returns null when the signature is invalid. */
  verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedEvent | null>;
  refund(input: { providerRef: string; amount: number; idempotencyKey: string }): Promise<{ refundRef: string }>;
}
