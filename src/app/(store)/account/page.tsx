import Link from "next/link";
import { deleteAddress, logout, requestDeletion } from "@/app/actions/account";
import { requireCustomerPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { paymentStatusLabel, statusLabel } from "@/lib/i18n/shared";
import { formatMoney } from "@/lib/money";
import { orderAccessToken } from "@/lib/services/orders";
import { AddressForm, ProfileForm } from "@/components/account/AccountForms";
import { Icon } from "@/components/ui/Icon";

export const metadata = { robots: { index: false } };

export default async function AccountPage() {
  const c = await requireCustomerPage();
  const t = await getT();
  const l = t.locale;
  const [orders, addresses, governorates, wishCount] = await Promise.all([
    db.order.findMany({ where: { customerId: c.id }, orderBy: { createdAt: "desc" }, take: 50, include: { _count: { select: { items: true } } } }),
    db.customerAddress.findMany({ where: { customerId: c.id }, include: { locality: { include: { governorate: true } } } }),
    db.governorate.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, include: { localities: { where: { active: true }, orderBy: { nameEn: "asc" } } } }),
    db.wishlistItem.count({ where: { customerId: c.id } }),
  ]);
  const fmt = new Intl.DateTimeFormat(l === "ar" ? "ar-PS-u-nu-latn" : "en-GB", { dateStyle: "medium" });

  return (
    <div className="container pb-24 pt-10 md:pt-14">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ivory-200 pb-8">
        <div>
          <p className="eyebrow">{t("حسابي", "My account")}</p>
          <h1 className="display mt-2 text-display-md">{t(`أهلاً، ${c.name.split(" ")[0]}`, `Hello, ${c.name.split(" ")[0]}`)}</h1>
        </div>
        <div className="flex gap-3">
          <Link href="/wishlist" className="btn-secondary btn-sm h-10"><Icon name="heart" className="h-4 w-4" />{t("المفضلة", "Wishlist")} ({wishCount})</Link>
          <form action={logout}><button className="btn-ghost btn-sm h-10"><Icon name="logout" className="h-4 w-4 flip-rtl" />{t("تسجيل الخروج", "Sign out")}</button></form>
        </div>
      </div>

      {c.status === "DELETION_REQUESTED" && (
        <p className="mt-6 rounded-xl bg-gold/10 px-4 py-3 text-sm text-gold-700">{t("استلمنا طلب حذف حسابك وسنعالجه قريباً.", "We've received your account deletion request and will process it shortly.")}</p>
      )}

      <div className="mt-10 grid gap-12 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="orders-h">
          <h2 id="orders-h" className="display text-2xl">{t("طلباتي", "My orders")}</h2>
          {orders.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-ivory-100 p-8 text-center">
              <p className="text-plum-600">{t("لا توجد طلبات بعد.", "No orders yet.")}</p>
              <Link href="/shop" className="btn-primary mt-5">{t("تسوقي الآن", "Shop now")}</Link>
            </div>
          ) : (
            <ul className="mt-6 divide-y divide-ivory-200 overflow-hidden rounded-2xl border border-ivory-200 bg-white/60">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/order/${o.number}?t=${orderAccessToken(o.id)}`} className="flex flex-wrap items-center justify-between gap-3 p-5 transition hover:bg-blush-50">
                    <div>
                      <p className="font-mono font-semibold" dir="ltr">{o.number}</p>
                      <p className="text-xs text-plum-500">{fmt.format(o.createdAt)} · {o._count.items} {t("منتجات", "items")}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="chip">{statusLabel(l, o.status)}</span>
                      <span className="chip">{paymentStatusLabel(l, o.paymentStatus)}</span>
                      <span className="font-semibold tabular-nums">{formatMoney(o.total, l)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-12">
          <section aria-labelledby="profile-h" className="card p-6">
            <h2 id="profile-h" className="mb-5 font-semibold">{t("الملف الشخصي", "Profile")}</h2>
            <ProfileForm name={c.name} phone={c.phone ?? ""} email={c.email ?? ""} />
          </section>

          <section aria-labelledby="addr-h" className="card p-6">
            <h2 id="addr-h" className="mb-5 font-semibold">{t("عناويني", "My addresses")}</h2>
            <ul className="mb-6 space-y-3">
              {addresses.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 rounded-xl bg-ivory-100 p-4 text-sm">
                  <span>
                    <span className="font-semibold">{a.label || a.fullName}</span>{a.isDefault && <span className="ms-2 text-xs text-gold-700">{t("افتراضي", "Default")}</span>}
                    <span className="block text-plum-600">{l === "ar" ? a.locality.governorate.nameAr : a.locality.governorate.nameEn} · {l === "ar" ? a.locality.nameAr : a.locality.nameEn}</span>
                    <span className="block text-plum-600">{a.street} — {a.details}</span>
                  </span>
                  <form action={deleteAddress}><input type="hidden" name="id" value={a.id} /><button className="text-plum-400 hover:text-danger" aria-label={t("حذف", "Delete")}><Icon name="trash" className="h-4 w-4" /></button></form>
                </li>
              ))}
            </ul>
            <details>
              <summary className="cursor-pointer text-sm font-semibold">{t("+ إضافة عنوان جديد", "+ Add a new address")}</summary>
              <div className="mt-5"><AddressForm governorates={governorates} /></div>
            </details>
          </section>

          {c.status !== "DELETION_REQUESTED" && (
            <section className="text-sm">
              <details>
                <summary className="cursor-pointer text-plum-500">{t("حذف الحساب", "Delete account")}</summary>
                <p className="mt-3 text-plum-600">{t("سيراجع فريقنا طلبك. نحتفظ بسجلات الطلبات للأغراض المحاسبية وفق القانون.", "Our team will review your request. Order records are retained for accounting as required by law.")}</p>
                <form action={requestDeletion} className="mt-3"><button className="btn-secondary btn-sm border-danger text-danger hover:bg-danger hover:text-white">{t("طلب حذف الحساب", "Request account deletion")}</button></form>
              </details>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
