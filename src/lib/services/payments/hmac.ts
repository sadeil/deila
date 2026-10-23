import { createHmac, timingSafeEqual } from "node:crypto";

export function hmacHex(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

/** Constant-time check of a signature header in the form "t=<unix>,v1=<hex>". */
export function verifySignedPayload(secret: string, rawBody: string, header: string | null, toleranceSec = 300) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = Number(parts.t);
  if (!t || !parts.v1 || !/^[0-9a-f]+$/i.test(parts.v1)) return false;
  if (Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;
  const expected = Buffer.from(hmacHex(secret, `${t}.${rawBody}`), "hex");
  const given = Buffer.from(parts.v1, "hex");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function signPayload(secret: string, rawBody: string, t = Math.floor(Date.now() / 1000)) {
  return `t=${t},v1=${hmacHex(secret, `${t}.${rawBody}`)}`;
}
