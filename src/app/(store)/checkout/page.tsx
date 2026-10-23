import type { Metadata } from "next";
import { getCustomer } from "@/lib/auth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";
import { getProvider } from "@/lib/services/payments";
import { CheckoutForm } from "@/components/store/CheckoutForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("إتمام الطلب", "Checkout"), robots: { index: false } };
}

export default async function CheckoutPage() {
  const [settings, customer, governorates] = await Promise.all([
    getSettings(),
    getCustomer(),
    db.governorate.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      include: { localities: { orderBy: { nameEn: "asc" }, include: { zone: { select: { active: true } } } } },
    }),
  ]);
  const addresses = customer
    ? await db.customerAddress.findMany({ where: { customerId: customer.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }], include: { locality: true } })
    : [];
  const provider = getProvider();

  return (
    <CheckoutForm
      governorates={governorates.map((g) => ({
        id: g.id, nameAr: g.nameAr, nameEn: g.nameEn,
        localities: g.localities.map((x) => ({ id: x.id, nameAr: x.nameAr, nameEn: x.nameEn, serviceable: x.active && !!x.zone?.active })),
      }))}
      payments={{
        cod: settings.payments.codEnabled,
        card: settings.payments.cardEnabled && !!provider,
        cardSandbox: !!provider?.sandbox,
      }}
      customer={customer ? { name: customer.name, phone: customer.phone ?? "", email: customer.email ?? "" } : null}
      addresses={addresses.map((a) => ({
        id: a.id, label: a.label, fullName: a.fullName, phone: a.phone, localityId: a.localityId, governorateId: a.locality.governorateId,
        street: a.street, details: a.details, landmark: a.landmark ?? "",
      }))}
    />
  );
}
