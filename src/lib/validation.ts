import { z } from "zod";
import { isValidPhone, normalizePhone } from "./utils";

export const phoneSchema = z
  .string()
  .trim()
  .refine(isValidPhone, "INVALID_PHONE")
  .transform(normalizePhone);

const text = (max: number) => z.string().trim().min(1, "REQUIRED").max(max);
const optText = (max: number) =>
  z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));

export const cartItemsSchema = z
  .array(z.object({ variantId: z.string().min(1).max(40), quantity: z.number().int().min(1).max(99) }))
  .min(1)
  .max(30);

export const checkoutSchema = z.object({
  idempotencyKey: z.string().uuid(),
  items: cartItemsSchema,
  couponCode: optText(40),
  fullName: text(80).refine((v) => v.length >= 3, "TOO_SHORT"),
  phone: phoneSchema,
  email: z.string().trim().email("INVALID_EMAIL").max(120).optional().or(z.literal("")).transform((v) => v || null),
  localityId: z.string().min(1, "REQUIRED").max(40),
  street: text(120),
  addressDetails: text(200),
  landmark: optText(120),
  deliveryNotes: optText(300),
  paymentMethod: z.enum(["COD", "CARD"]),
  locale: z.enum(["ar", "en"]).default("ar"),
  saveAddress: z.boolean().optional(),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const quoteSchema = z.object({
  items: z.array(z.object({ variantId: z.string().max(40), quantity: z.number().int().min(0).max(99) })).max(30),
  couponCode: z.string().trim().max(40).optional().nullable(),
  localityId: z.string().max(40).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
});

export const passwordSchema = z.string().min(8, "PASSWORD_SHORT").max(128);

export const registerSchema = z.object({
  name: text(80),
  email: z.string().trim().toLowerCase().email("INVALID_EMAIL").max(120),
  phone: phoneSchema.optional().or(z.literal("").transform(() => undefined)),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("INVALID_EMAIL"),
  password: z.string().min(1, "REQUIRED").max(128),
});

export function fieldErrors(err: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = i.path.join(".") || "_";
    if (!out[k]) out[k] = i.message;
  }
  return out;
}
