import { fail, handle, json, limit, parseBody } from "@/lib/api";
import { getCustomer } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { createOrder, OrderError } from "@/lib/services/orders";
import { checkoutSchema } from "@/lib/validation";

export const POST = handle(async (req: Request) => {
  if (!(await limit("checkout", 10, 10 * 60_000))) return fail("RATE_LIMITED", 429);
  const body = await parseBody(req, checkoutSchema);
  if (!body.ok) return body.res;
  const customer = await getCustomer();
  try {
    const res = await createOrder(body.data, customer?.id ?? null);
    if (!res.duplicate) {
      await audit({ actorType: customer ? "CUSTOMER" : "SYSTEM", actorId: customer?.id, action: "order.create", entity: "Order", entityId: res.orderId, data: { number: res.number } });
    }
    return json({ number: res.number, token: res.token, redirectUrl: res.redirectUrl }, res.duplicate ? 200 : 201);
  } catch (e) {
    if (e instanceof OrderError) return fail(e.code, 409, e.quote ? { quote: e.quote } : {});
    throw e;
  }
});
