import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_UPLOAD = 5 * 1024 * 1024;

/** Detect the real type from magic bytes — the client-declared MIME type is never trusted. SVG is rejected (script risk). */
export function sniffImage(buf: Buffer): { ext: string; mime: string } | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: "png", mime: "image/png" };
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return { ext: "webp", mime: "image/webp" };
  if (buf.subarray(4, 12).toString("ascii").startsWith("ftypavif")) return { ext: "avif", mime: "image/avif" };
  return null;
}

/**
 * Stores an image and returns its public URL.
 * With SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set, uploads to Supabase Storage (bucket SUPABASE_BUCKET, default "media").
 * Otherwise writes to /public/uploads (local development only — use object storage in production).
 */
export async function storeImage(buf: Buffer, folder = "products") {
  const type = sniffImage(buf);
  if (!type) throw new Error("UNSUPPORTED_FILE");
  if (buf.length > MAX_UPLOAD) throw new Error("FILE_TOO_LARGE");
  const name = `${folder}/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${type.ext}`;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    const bucket = process.env.SUPABASE_BUCKET || "media";
    const res = await fetch(`${url}/storage/v1/object/${bucket}/${name}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": type.mime, "x-upsert": "false", "Cache-Control": "31536000" },
      body: new Uint8Array(buf),
    });
    if (!res.ok) throw new Error(`STORAGE_${res.status}`);
    return `${url}/storage/v1/object/public/${bucket}/${name}`;
  }
  const dest = path.join(process.cwd(), "public", "uploads", name);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, buf);
  return `/uploads/${name}`;
}
