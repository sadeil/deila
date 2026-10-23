import { handle, json } from "@/lib/api";
import { productsWhere } from "@/lib/catalog";

export const GET = handle(async (req: Request) => {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 100);
  if (!ids.length) return json({ items: [] });
  return json({ items: await productsWhere({ id: { in: ids } }, 100) });
});
