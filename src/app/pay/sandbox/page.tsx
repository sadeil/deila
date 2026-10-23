import { randomUUID } from "node:crypto";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { signPayload } from "@/lib/services/payments/hmac";
import { orderAccessToken } from "@/lib/services/orders";
import { sandboxProvider } from "@/lib/services/payments/sandbox";
import { siteUrl } from "@/lib/utils";
import { Wordmark } from "@/components/brand/Wordmark";

export const metadata = { robots: { index: false } };

/**
 * Simulated provider-hosted page for the SANDBOX provider. Never available in production.
 * It collects no card data; it only fires a signed webhook so the real verification path runs.
 */
export default async function SandboxPayPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  if (!sandboxProvider.isConfigured()) notFound();
  const { ref } = await searchParams;
  const payment = ref ? await db.payment.findUnique({ where: { providerRef: ref }, include: { order: true } }) : null;
  if (!payment) notFound();

  async function simulate(form: FormData) {
    "use server";
    if (!sandboxProvider.isConfigured()) return;
    const status = form.get("status") === "PAID" ? "PAID" : "FAILED";
    const p = await db.payment.findUniqueOrThrow({ where: { providerRef: String(form.get("ref")) }, include: { order: true } });
    const body = JSON.stringify({ id: `evt_${randomUUID()}`, type: "payment.updated", data: { ref: p.providerRef, status, amount: p.amount, currency: p.currency } });
    await fetch(siteUrl("/api/payments/webhook/sandbox"), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-sandbox-signature": signPayload(process.env.SANDBOX_WEBHOOK_SECRET!, body) },
      body,
    });
    redirect(`/order/${p.order.number}?t=${orderAccessToken(p.orderId)}&new=1`);
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-ivory-100 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-lift">
        <p className="bg-warning px-6 py-3 text-center text-sm font-bold text-white">SANDBOX — TEST MODE · NO REAL PAYMENT</p>
        <div className="space-y-6 p-8">
          <Wordmark className="h-5" />
          <div>
            <p className="text-sm text-plum-500">Order</p>
            <p className="font-mono text-lg font-semibold">{payment.order.number}</p>
          </div>
          <div>
            <p className="text-sm text-plum-500">Amount</p>
            <p className="text-3xl font-semibold">{formatMoney(payment.amount, "en")}</p>
          </div>
          <p className="text-sm text-plum-600">This page stands in for the payment provider&apos;s hosted checkout. Choose an outcome to send a signed webhook to DELLA.</p>
          <form action={simulate} className="grid grid-cols-2 gap-3">
            <input type="hidden" name="ref" value={payment.providerRef!} />
            <button name="status" value="PAID" className="btn-primary">Simulate success</button>
            <button name="status" value="FAILED" className="btn-secondary">Simulate failure</button>
          </form>
        </div>
      </div>
    </div>
  );
}
