import { db } from "./db";
import { clientIp } from "./request";
import type { Prisma } from "@prisma/client";

export async function audit(entry: {
  actorType: "ADMIN" | "CUSTOMER" | "SYSTEM" | "PROVIDER";
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  data?: Prisma.InputJsonValue;
}) {
  let ip: string | undefined;
  try { ip = await clientIp(); } catch { /* outside request scope */ }
  await db.auditLog.create({ data: { ...entry, ip } });
}
