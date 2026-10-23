/**
 * Create or reset a Super Admin from the command line (never via the public site):
 *   ADMIN_EMAIL=you@della.ps ADMIN_PASSWORD='a-long-passphrase' npm run admin:create
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (min 12 chars).");
  }
  const role = await db.adminRole.findUnique({ where: { key: "SUPER_ADMIN" } });
  if (!role) throw new Error("Roles missing — run `npm run db:seed` first.");
  const passwordHash = await bcrypt.hash(password, 12);
  await db.adminUser.upsert({
    where: { email },
    create: { email, name: "Super Admin", passwordHash, roleId: role.id },
    update: { passwordHash, active: true, roleId: role.id, sessionVersion: { increment: 1 } },
  });
  console.log(`Super Admin ready: ${email}`);
}

main().finally(() => db.$disconnect());
