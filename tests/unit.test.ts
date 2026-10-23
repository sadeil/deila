import { describe, expect, it } from "vitest";
import { allocateDiscount, commissionAfterRefund, lineCommission, resolveCommissionRule } from "@/lib/services/commission";
import { signPayload, verifySignedPayload } from "@/lib/services/payments/hmac";
import { formatMoney, toAgorot } from "@/lib/money";
import { isValidPhone, normalizePhone } from "@/lib/utils";
import { toCsv } from "@/lib/admin-queries";
import { canTransition } from "@/lib/services/orders";
import { sniffImage } from "@/lib/storage";

describe("money", () => {
  it("parses shekel amounts into integer agorot", () => {
    expect(toAgorot("149.90")).toBe(14990);
    expect(toAgorot(20)).toBe(2000);
    expect(() => toAgorot("-1")).toThrow();
  });
  it("formats ILS for both locales", () => {
    expect(formatMoney(14990, "en")).toBe("₪149.90");
    expect(formatMoney(2000, "ar")).toBe("20 ₪");
  });
});

describe("phone validation (Palestinian mobile numbers)", () => {
  it("normalises +970 / 972 / missing leading zero", () => {
    expect(normalizePhone("+970 599 123 456")).toBe("0599123456");
    expect(normalizePhone("972-56-123-4567")).toBe("0561234567");
    expect(normalizePhone("599123456")).toBe("0599123456");
  });
  it("rejects invalid numbers", () => {
    expect(isValidPhone("12345")).toBe(false);
    expect(isValidPhone("0299123456")).toBe(false);
    expect(isValidPhone("0599123456")).toBe(true);
  });
});

describe("commission rules", () => {
  const partner = { commissionType: "PERCENT" as const, commissionValue: 1000 };
  const fallback = { defaultType: "PERCENT" as const, defaultValue: 500 };
  it("prefers product rule, then partner, then default", () => {
    expect(resolveCommissionRule({ commissionType: "FIXED", commissionValue: 1500 }, partner, fallback).source).toBe("PRODUCT");
    expect(resolveCommissionRule({ commissionType: null, commissionValue: null }, partner, fallback).source).toBe("PARTNER");
    expect(resolveCommissionRule({ commissionType: null, commissionValue: null }, null, fallback).source).toBe("DEFAULT");
  });
  it("computes percent (basis points) and fixed-per-unit commission", () => {
    expect(lineCommission({ type: "PERCENT", value: 1000, source: "PARTNER" }, 25800, 2)).toBe(2580);
    expect(lineCommission({ type: "FIXED", value: 1500, source: "PRODUCT" }, 25800, 2)).toBe(3000);
    expect(lineCommission({ type: "FIXED", value: 99999, source: "PRODUCT" }, 1000, 1)).toBe(1000); // capped at line value
  });
  it("allocates an order discount exactly across lines", () => {
    const shares = allocateDiscount([1000, 2000, 3001], 1000);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(1000);
    expect(allocateDiscount([1000, 2000], 300, [false, true])).toEqual([0, 300]);
  });
  it("scales commission after partial refund", () => {
    expect(commissionAfterRefund(2000, 20000, 5000)).toBe(1500);
    expect(commissionAfterRefund(2000, 20000, 30000)).toBe(0);
  });
});

describe("webhook signatures", () => {
  const secret = "s3cret";
  const body = JSON.stringify({ id: "evt_1" });
  it("accepts a valid signature and rejects tampering/replay", () => {
    const sig = signPayload(secret, body);
    expect(verifySignedPayload(secret, body, sig)).toBe(true);
    expect(verifySignedPayload(secret, body + " ", sig)).toBe(false);
    expect(verifySignedPayload("wrong", body, sig)).toBe(false);
    expect(verifySignedPayload(secret, body, signPayload(secret, body, Math.floor(Date.now() / 1000) - 3600))).toBe(false);
    expect(verifySignedPayload(secret, body, null)).toBe(false);
    expect(verifySignedPayload(secret, body, "t=1,v1=zz")).toBe(false);
  });
});

describe("order state machine", () => {
  it("enforces valid transitions", () => {
    expect(canTransition("PENDING_CONFIRMATION", "CONFIRMED")).toBe(true);
    expect(canTransition("PENDING_CONFIRMATION", "DELIVERED")).toBe(false);
    expect(canTransition("DELIVERED", "PREPARING")).toBe(false);
    expect(canTransition("CANCELED", "CONFIRMED")).toBe(false);
    expect(canTransition("SHIPPED", "RETURNED")).toBe(true);
  });
});

describe("CSV export", () => {
  it("escapes quotes and neutralises formula injection, with BOM", () => {
    const csv = toCsv([["a", 'b"c', "=HYPERLINK(1)", "x,y"]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('"b""c"');
    expect(csv).toContain("'=HYPERLINK(1)");
    expect(csv).toContain('"x,y"');
  });
});

describe("upload sniffing", () => {
  it("detects real image types and rejects others (incl. SVG)", () => {
    expect(sniffImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]))?.ext).toBe("png");
    expect(sniffImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))?.ext).toBe("jpg");
    expect(sniffImage(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script/></svg>"))).toBeNull();
  });
});
