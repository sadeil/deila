import { fail, handle, json } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { MAX_UPLOAD, storeImage } from "@/lib/storage";

export const POST = handle(async (req: Request) => {
  const admin = await requireAdmin("products.manage").catch(() => requireAdmin("content.manage"));
  if (!rateLimit(`upload:${admin.id}`, 60, 10 * 60_000).ok) return fail("RATE_LIMITED", 429);
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_UPLOAD + 10_000) return fail("FILE_TOO_LARGE", 413);
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail("NO_FILE");
  if (file.size > MAX_UPLOAD) return fail("FILE_TOO_LARGE", 413);
  const folder = form.get("folder") === "content" ? "content" : "products";
  try {
    const url = await storeImage(Buffer.from(await file.arrayBuffer()), folder);
    await audit({ actorType: "ADMIN", actorId: admin.id, actorName: admin.name, action: "upload.image", entity: "Upload", data: { url, size: file.size } });
    return json({ url });
  } catch (e) {
    const code = e instanceof Error ? e.message : "SERVER";
    return fail(code === "UNSUPPORTED_FILE" || code === "FILE_TOO_LARGE" ? code : "UPLOAD_FAILED", 400);
  }
});
