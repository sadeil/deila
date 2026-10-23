import "server-only";
import type { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { normalizePhone } from "./utils";

export type OrderFilters = {
  q?: string; status?: string; payment?: string; method?: string; gov?: string; from?: string; to?: string; page?: string;
};

const STATUS = ["PENDING_CONFIRMATION", "CONFIRMED", "PREPARING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELED", "RETURNED"];
const PAY = ["UNPAID", "PENDING", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"];

export function orderWhere(f: OrderFilters, partnerId?: string | null): Prisma.OrderWhereInput {
  const and: Prisma.OrderWhereInput[] = [];
  if (partnerId) and.push({ partnerId });
  if (f.q?.trim()) {
    const q = f.q.trim().slice(0, 60);
    const phone = normalizePhone(q);
    and.push({ OR: [{ number: { contains: q.toUpperCase() } }, { fullName: { contains: q } }, { phone: { contains: phone } }, { email: { contains: q.toLowerCase() } }] });
  }
  if (f.status && STATUS.includes(f.status)) and.push({ status: f.status as OrderStatus });
  if (f.payment && PAY.includes(f.payment)) and.push({ paymentStatus: f.payment as PaymentStatus });
  if (f.method === "COD" || f.method === "CARD") and.push({ paymentMethod: f.method as PaymentMethod });
  if (f.gov) and.push({ governorateName: f.gov });
  if (f.from && /^\d{4}-\d{2}-\d{2}$/.test(f.from)) and.push({ createdAt: { gte: new Date(`${f.from}T00:00:00Z`) } });
  if (f.to && /^\d{4}-\d{2}-\d{2}$/.test(f.to)) and.push({ createdAt: { lte: new Date(`${f.to}T23:59:59Z`) } });
  return { AND: and };
}

/** RFC-4180 CSV with BOM so Excel opens Arabic correctly; neutralises spreadsheet formula injection. */
export function toCsv(rows: (string | number | null | undefined)[][]) {
  const cell = (v: string | number | null | undefined) => {
    let s = v == null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
}
