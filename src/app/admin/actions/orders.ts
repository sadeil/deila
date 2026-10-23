"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminAction, fd, type ActionResult } from "@/lib/admin-action";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { toAgorot } from "@/lib/money";
import { OrderError, processRefund, recordCodPayment, transitionOrder } from "@/lib/services/orders";

const STATUSES = ["CONFIRMED", "PREPARING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELED", "RETURNED"] as const;

async function scoped(orderId: string, partnerId: string | null) {
  const o = await db.order.findUnique({ where: { id: orderId }, select: { partnerId: true, number: true } });
  if (!o || (partnerId && o.partnerId !== partnerId)) throw new OrderError("FORBIDDEN");
  return o;
}

export async function changeStatus(_: ActionResult, form: FormData) {
  return adminAction("orders.manage", async (admin) => {
    const v = z.object({
      orderId: z.string().min(1),
      to: z.enum(STATUSES),
      note: z.string().max(500).optional(),
      trackingRef: z.string().trim().max(80).optional(),
      courierId: z.string().max(40).optional(),
      restock: z.string().optional(),
    }).parse(fd(form));
    if ((v.to === "CANCELED" || v.to === "RETURNED") && !v.note?.trim()) return { error: "VALIDATION", fields: { note: "REQUIRED" } };
    const o = await scoped(v.orderId, admin.partnerId);
    await transitionOrder(v.orderId, v.to, { type: "ADMIN", id: admin.id, name: admin.name, partnerId: admin.partnerId }, {
      note: v.note || undefined, trackingRef: v.trackingRef || undefined, courierId: v.courierId || undefined,
      restock: v.to === "RETURNED" ? v.restock === "on" : undefined,
    });
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: `order.status.${v.to.toLowerCase()}`, entity: "Order", entityId: v.orderId, data: { number: o.number, note: v.note } });
    revalidatePath(`/admin/orders/${v.orderId}`);
    revalidatePath("/admin/orders");
  });
}

export async function recordCod(_: ActionResult, form: FormData) {
  return adminAction("orders.manage", async (admin) => {
    const v = z.object({ orderId: z.string().min(1), collectedBy: z.enum(["PARTNER", "DELLA", "COURIER"]) }).parse(fd(form));
    const o = await scoped(v.orderId, admin.partnerId);
    await recordCodPayment(v.orderId, { type: "ADMIN", id: admin.id, partnerId: admin.partnerId }, v.collectedBy);
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: "order.cod_collected", entity: "Order", entityId: v.orderId, data: { number: o.number, collectedBy: v.collectedBy } });
    revalidatePath(`/admin/orders/${v.orderId}`);
  });
}

export async function refund(_: ActionResult, form: FormData) {
  return adminAction("orders.refund", async (admin) => {
    const v = z.object({ orderId: z.string().min(1), amount: z.string().min(1), reason: z.string().trim().min(3).max(300) }).parse(fd(form));
    const o = await scoped(v.orderId, admin.partnerId);
    const amount = toAgorot(v.amount);
    await processRefund(v.orderId, amount, v.reason, { type: "ADMIN", id: admin.id });
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: "order.refund", entity: "Order", entityId: v.orderId, data: { number: o.number, amount, reason: v.reason } });
    revalidatePath(`/admin/orders/${v.orderId}`);
  });
}

export async function addNote(_: ActionResult, form: FormData) {
  return adminAction("orders.view", async (admin) => {
    const v = z.object({ orderId: z.string().min(1), body: z.string().trim().min(1).max(1000) }).parse(fd(form));
    await scoped(v.orderId, admin.partnerId);
    await db.orderNote.create({ data: { orderId: v.orderId, body: v.body, authorId: admin.id, authorName: admin.name } });
    revalidatePath(`/admin/orders/${v.orderId}`);
    return { ok: true, message: undefined };
  });
}

export async function updateDelivery(_: ActionResult, form: FormData) {
  return adminAction("orders.manage", async (admin) => {
    const v = z.object({
      orderId: z.string().min(1),
      trackingRef: z.string().trim().max(80).optional(),
      courierId: z.string().max(40).optional(),
      courierNotes: z.string().trim().max(500).optional(),
    }).parse(fd(form));
    const o = await scoped(v.orderId, admin.partnerId);
    await db.delivery.update({
      where: { orderId: v.orderId },
      data: { trackingRef: v.trackingRef || null, courierId: v.courierId || null, courierNotes: v.courierNotes || null },
    });
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: "order.delivery_updated", entity: "Order", entityId: v.orderId, data: { number: o.number, trackingRef: v.trackingRef } });
    revalidatePath(`/admin/orders/${v.orderId}`);
  });
}
