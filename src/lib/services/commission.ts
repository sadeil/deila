import type { CommissionType } from "@prisma/client";

export type CommissionRule = { type: CommissionType; value: number; source: "PRODUCT" | "PARTNER" | "DEFAULT" };

/** Rule priority: product-specific → partner agreement → store default. */
export function resolveCommissionRule(
  product: { commissionType: CommissionType | null; commissionValue: number | null },
  partner: { commissionType: CommissionType; commissionValue: number } | null,
  fallback: { defaultType: CommissionType; defaultValue: number },
): CommissionRule {
  if (product.commissionType && product.commissionValue != null)
    return { type: product.commissionType, value: product.commissionValue, source: "PRODUCT" };
  if (partner) return { type: partner.commissionType, value: partner.commissionValue, source: "PARTNER" };
  return { type: fallback.defaultType, value: fallback.defaultValue, source: "DEFAULT" };
}

/**
 * Commission for one order line.
 * PERCENT value is in basis points (1000 = 10%) applied to the net line value (after discount share, excl. shipping).
 * FIXED value is agorot per unit, capped at the net line value.
 */
export function lineCommission(rule: CommissionRule, netLineValue: number, quantity: number) {
  if (netLineValue <= 0) return 0;
  if (rule.type === "PERCENT") return Math.round((netLineValue * rule.value) / 10_000);
  return Math.min(rule.value * quantity, netLineValue);
}

/** Split an order-level discount across lines proportionally (largest-remainder, sums exactly). */
export function allocateDiscount(lineTotals: number[], discount: number, eligible?: boolean[]) {
  const mask = eligible ?? lineTotals.map(() => true);
  const base = lineTotals.reduce((s, v, i) => s + (mask[i] ? v : 0), 0);
  if (discount <= 0 || base <= 0) return lineTotals.map(() => 0);
  const raw = lineTotals.map((v, i) => (mask[i] ? (v * discount) / base : 0));
  const floored = raw.map(Math.floor);
  let rest = discount - floored.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (rest <= 0) break;
    if (!mask[i]) continue;
    floored[i]++;
    rest--;
  }
  return floored;
}

/** After a partial refund, scale the commission to the merchandise value actually kept. */
export function commissionAfterRefund(amount: number, baseAmount: number, refundedMerchandise: number) {
  if (baseAmount <= 0) return 0;
  const kept = Math.max(0, baseAmount - refundedMerchandise);
  return Math.round((amount * kept) / baseAmount);
}
