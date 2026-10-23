import { fail, handle, json, limit, parseBody } from "@/lib/api";
import { quoteCart } from "@/lib/services/pricing";
import { getSettings } from "@/lib/settings";
import { normalizePhone } from "@/lib/utils";
import { quoteSchema } from "@/lib/validation";

/** Server-side pricing: the client sends only variant IDs and quantities. */
export const POST = handle(async (req: Request) => {
  if (!(await limit("quote", 120, 60_000))) return fail("RATE_LIMITED", 429);
  const body = await parseBody(req, quoteSchema);
  if (!body.ok) return body.res;
  const settings = await getSettings();
  const quote = await quoteCart({
    items: body.data.items.filter((i) => i.quantity > 0),
    couponCode: body.data.couponCode,
    localityId: body.data.localityId,
    phone: body.data.phone ? normalizePhone(body.data.phone) : null,
    maxQtyPerItem: settings.catalog.maxQtyPerItem,
  });
  return json(quote);
});
