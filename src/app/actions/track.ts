"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { orderAccessToken } from "@/lib/services/orders";
import { normalizePhone } from "@/lib/utils";

/** Lookup needs BOTH the order number and the phone used at checkout; heavily rate-limited. */
export async function trackOrder(_: unknown, form: FormData): Promise<{ error: string } | undefined> {
  const ip = await clientIp();
  if (!rateLimit(`track:${ip}`, 10, 15 * 60_000).ok) return { error: "RATE_LIMITED" };
  const number = String(form.get("number") ?? "").trim().toUpperCase().slice(0, 20);
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  const order = number ? await db.order.findUnique({ where: { number }, select: { id: true, phone: true } }) : null;
  if (!order || order.phone !== phone) return { error: "NOT_FOUND" };
  redirect(`/order/${number}?t=${orderAccessToken(order.id)}`);
}
