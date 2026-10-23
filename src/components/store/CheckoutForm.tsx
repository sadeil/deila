"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useT } from "@/lib/i18n/client";
import { errorLabel } from "@/lib/i18n/shared";
import { isValidPhone } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Wordmark } from "../brand/Wordmark";
import { Icon } from "../ui/Icon";
import { useCart } from "./CartProvider";
import { OrderSummary } from "./OrderSummary";

type Gov = { id: string; nameAr: string; nameEn: string; localities: { id: string; nameAr: string; nameEn: string; serviceable: boolean }[] };
type Addr = { id: string; label: string | null; fullName: string; phone: string; localityId: string; governorateId: string; street: string; details: string; landmark: string };

export function CheckoutForm({ governorates, payments, customer, addresses }: {
  governorates: Gov[];
  payments: { cod: boolean; card: boolean; cardSandbox: boolean };
  customer: { name: string; phone: string; email: string } | null;
  addresses: Addr[];
}) {
  const t = useT();
  const l = t.locale;
  const router = useRouter();
  const cart = useCart();
  const idem = useRef<string>("");
  const first = addresses[0];
  const [f, setF] = useState({
    fullName: first?.fullName ?? customer?.name ?? "",
    phone: first?.phone ?? customer?.phone ?? "",
    email: customer?.email ?? "",
    governorateId: first?.governorateId ?? "",
    localityId: first?.localityId ?? "",
    street: first?.street ?? "",
    addressDetails: first?.details ?? "",
    landmark: first?.landmark ?? "",
    deliveryNotes: "",
    paymentMethod: (payments.cod ? "COD" : "CARD") as "COD" | "CARD",
    saveAddress: !!customer && addresses.length === 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const set = (k: keyof typeof f, v: string | boolean) => { setF((p) => ({ ...p, [k]: v })); setErrors((e) => ({ ...e, [k]: "" })); };

  useEffect(() => { if (!idem.current) idem.current = crypto.randomUUID(); }, []);

  const gov = governorates.find((g) => g.id === f.governorateId);
  const phoneForQuote = isValidPhone(f.phone) ? f.phone : null;
  const { refreshQuote, ready, lines } = cart;
  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(() => void refreshQuote({ localityId: f.localityId || null, phone: phoneForQuote }), 200);
    return () => clearTimeout(id);
  }, [ready, refreshQuote, f.localityId, phoneForQuote]);

  const q = cart.quote;
  const codBlocked = !!q?.shipping && q.shipping.serviceable && !q.shipping.codAvailable;
  useEffect(() => { if (codBlocked && f.paymentMethod === "COD" && payments.card) set("paymentMethod", "CARD"); }, [codBlocked]); // eslint-disable-line react-hooks/exhaustive-deps

  const validate = () => {
    const e: Record<string, string> = {};
    if (f.fullName.trim().length < 3) e.fullName = "TOO_SHORT";
    if (!isValidPhone(f.phone)) e.phone = "INVALID_PHONE";
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = "INVALID_EMAIL";
    if (!f.governorateId) e.governorateId = "REQUIRED";
    if (!f.localityId) e.localityId = "REQUIRED";
    if (!f.street.trim()) e.street = "REQUIRED";
    if (!f.addressDetails.trim()) e.addressDetails = "REQUIRED";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const canSubmit = useMemo(() => !!q && !q.errors.length && !!q.shipping?.serviceable && !submitting && agreed &&
    ((f.paymentMethod === "COD" && payments.cod && q.shipping.codAvailable) || (f.paymentMethod === "CARD" && payments.card)),
    [q, submitting, agreed, f.paymentMethod, payments]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) { document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus(); return; }
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: idem.current,
          items: lines.map((x) => ({ variantId: x.variantId, quantity: x.quantity })),
          couponCode: cart.coupon,
          fullName: f.fullName, phone: f.phone, email: f.email, localityId: f.localityId,
          street: f.street, addressDetails: f.addressDetails, landmark: f.landmark, deliveryNotes: f.deliveryNotes,
          paymentMethod: f.paymentMethod, locale: l, saveAddress: f.saveAddress,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fields) setErrors(data.fields);
        setFormError(data.error === "VALIDATION" ? "REQUIRED" : data.error);
        if (data.error !== "VALIDATION") void refreshQuote({ localityId: f.localityId, phone: phoneForQuote });
        setSubmitting(false);
        return;
      }
      cart.clear();
      if (data.redirectUrl) window.location.assign(data.redirectUrl);
      else router.push(`/order/${data.number}?t=${data.token}&new=1`);
    } catch {
      setFormError("SERVER");
      setSubmitting(false);
    }
  };

  if (ready && lines.length === 0 && !submitting) {
    return (
      <div className="container flex flex-col items-center py-24 text-center">
        <h1 className="display text-display-md">{t("سلتك فارغة", "Your bag is empty")}</h1>
        <Link href="/shop" className="btn-primary mt-8">{t("تسوقي الآن", "Shop now")}</Link>
      </div>
    );
  }

  const err = (k: string) => errors[k] ? <p id={`${k}-err`} className="mt-1.5 text-xs text-danger">{errorLabel(l, errors[k])}</p> : null;
  const fieldProps = (k: keyof typeof f) => ({
    id: k, value: String(f[k]), onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(k, e.target.value),
    "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${k}-err` : undefined, className: cn("field", errors[k] && "field-error"),
  });

  return (
    <div className="container pb-24 pt-8 md:pt-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="display text-display-md">{t("إتمام الطلب", "Checkout")}</h1>
        <span className="flex items-center gap-2 text-xs text-plum-500"><Icon name="shield" className="h-4 w-4" />{t("اتصال آمن", "Secure checkout")}</span>
      </div>

      <form onSubmit={submit} noValidate className="grid gap-10 lg:grid-cols-[1fr_420px] lg:gap-14">
        <div className="space-y-10">
          {!customer && (
            <p className="rounded-2xl bg-blush-50 px-5 py-4 text-sm">
              {t("تطلبين كضيفة. ", "Checking out as a guest. ")}
              <Link href="/account/login?next=/checkout" className="font-semibold underline underline-offset-2">{t("سجّلي الدخول", "Sign in")}</Link>
              {t(" لحفظ عناوينك وتتبع طلباتك.", " to save addresses and track orders.")}
            </p>
          )}

          <section aria-labelledby="s-contact">
            <h2 id="s-contact" className="mb-5 flex items-center gap-3 text-lg font-semibold"><span className="grid h-7 w-7 place-items-center rounded-full bg-plum text-xs text-ivory">1</span>{t("بيانات التواصل", "Contact details")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><label htmlFor="fullName" className="label">{t("الاسم الكامل", "Full name")} *</label><input {...fieldProps("fullName")} autoComplete="name" />{err("fullName")}</div>
              <div><label htmlFor="phone" className="label">{t("رقم الجوال", "Mobile number")} *</label><input {...fieldProps("phone")} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="059 123 4567" className={cn("field text-start", errors.phone && "field-error")} />{err("phone")}</div>
              <div><label htmlFor="email" className="label">{t("البريد الإلكتروني (اختياري)", "Email (optional)")}</label><input {...fieldProps("email")} type="email" autoComplete="email" dir="ltr" className={cn("field text-start", errors.email && "field-error")} />{err("email")}</div>
            </div>
          </section>

          <section aria-labelledby="s-address">
            <h2 id="s-address" className="mb-5 flex items-center gap-3 text-lg font-semibold"><span className="grid h-7 w-7 place-items-center rounded-full bg-plum text-xs text-ivory">2</span>{t("عنوان التوصيل", "Delivery address")}</h2>
            {addresses.length > 0 && (
              <div className="mb-5 flex flex-wrap gap-2">
                {addresses.map((a) => (
                  <button key={a.id} type="button" className="chip hover:border-plum" onClick={() => setF((p) => ({ ...p, fullName: a.fullName, phone: a.phone, governorateId: a.governorateId, localityId: a.localityId, street: a.street, addressDetails: a.details, landmark: a.landmark }))}>
                    <Icon name="map" className="h-3.5 w-3.5" />{a.label || a.street}
                  </button>
                ))}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="governorateId" className="label">{t("المحافظة", "Governorate")} *</label>
                <select {...fieldProps("governorateId")} onChange={(e) => { set("governorateId", e.target.value); set("localityId", ""); }}>
                  <option value="">{t("اختاري المحافظة", "Select governorate")}</option>
                  {governorates.map((g) => <option key={g.id} value={g.id}>{l === "ar" ? g.nameAr : g.nameEn}</option>)}
                </select>{err("governorateId")}
              </div>
              <div>
                <label htmlFor="localityId" className="label">{t("المدينة / البلدة", "City / village")} *</label>
                <select {...fieldProps("localityId")} disabled={!gov}>
                  <option value="">{gov ? t("اختاري المدينة", "Select city") : t("اختاري المحافظة أولاً", "Choose governorate first")}</option>
                  {gov?.localities.map((x) => (
                    <option key={x.id} value={x.id} disabled={!x.serviceable}>
                      {l === "ar" ? x.nameAr : x.nameEn}{!x.serviceable ? t(" — التوصيل غير متاح حالياً", " — not currently served") : ""}
                    </option>
                  ))}
                </select>{err("localityId")}
              </div>
              <div className="sm:col-span-2"><label htmlFor="street" className="label">{t("الحي / الشارع", "Neighbourhood / street")} *</label><input {...fieldProps("street")} autoComplete="address-line1" />{err("street")}</div>
              <div className="sm:col-span-2"><label htmlFor="addressDetails" className="label">{t("تفاصيل العنوان (بناية، طابق…)", "Address details (building, floor…)")} *</label><input {...fieldProps("addressDetails")} autoComplete="address-line2" />{err("addressDetails")}</div>
              <div className="sm:col-span-2"><label htmlFor="landmark" className="label">{t("معلم قريب (اختياري)", "Nearby landmark (optional)")}</label><input {...fieldProps("landmark")} /></div>
              <div className="sm:col-span-2"><label htmlFor="deliveryNotes" className="label">{t("ملاحظات للتوصيل (اختياري)", "Delivery notes (optional)")}</label><textarea {...fieldProps("deliveryNotes")} rows={2} /></div>
              {customer && (
                <label className="flex items-center gap-3 text-sm sm:col-span-2"><input type="checkbox" className="h-4 w-4 accent-plum" checked={f.saveAddress} onChange={(e) => set("saveAddress", e.target.checked)} />{t("احفظي هذا العنوان في حسابي", "Save this address to my account")}</label>
              )}
            </div>
            <AnimatePresence>
              {q?.shipping && !q.shipping.serviceable && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 flex items-start gap-2 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
                  <Icon name="alert" className="mt-0.5 h-4 w-4" />{errorLabel(l, "NOT_SERVICEABLE")}
                </motion.p>
              )}
            </AnimatePresence>
          </section>

          <section aria-labelledby="s-pay">
            <h2 id="s-pay" className="mb-5 flex items-center gap-3 text-lg font-semibold"><span className="grid h-7 w-7 place-items-center rounded-full bg-plum text-xs text-ivory">3</span>{t("طريقة الدفع", "Payment method")}</h2>
            <div className="grid gap-3" role="radiogroup">
              <PayOption checked={f.paymentMethod === "COD"} disabled={!payments.cod || codBlocked} onSelect={() => set("paymentMethod", "COD")} icon="cash"
                title={t("الدفع عند الاستلام", "Cash on delivery")}
                desc={!payments.cod ? t("غير متاح حالياً", "Currently unavailable") : codBlocked ? errorLabel(l, "COD_NOT_AVAILABLE_AREA") : t("ادفعي نقداً عند استلام طلبك. سنتصل بك لتأكيد الطلب.", "Pay in cash when your order arrives. We'll call to confirm your order.")} />
              <PayOption checked={f.paymentMethod === "CARD"} disabled={!payments.card} onSelect={() => set("paymentMethod", "CARD")} icon="card"
                title={t("بطاقة فيزا / ماستركارد", "Visa / Mastercard")}
                desc={!payments.card ? t("الدفع الإلكتروني بانتظار تفعيل بوابة الدفع المعتمدة — قريباً.", "Online card payment is awaiting activation of an approved payment gateway — coming soon.")
                  : payments.cardSandbox ? t("وضع الاختبار (Sandbox) — لن تُخصم أي أموال.", "SANDBOX test mode — no money will be charged.")
                  : t("ستنتقلين إلى صفحة الدفع الآمنة لدى البوابة. لا نخزّن بيانات بطاقتك.", "You'll be redirected to the gateway's secure page. We never store your card details.")} />
            </div>
          </section>
        </div>

        <aside className="h-fit space-y-6 rounded-3xl bg-white/70 p-6 ring-1 ring-ivory-200 md:p-8 lg:sticky lg:top-24">
          <div className="flex items-center justify-between">
            <h2 className="display text-2xl">{t("ملخص الطلب", "Order summary")}</h2>
            <Wordmark className="h-3.5 opacity-60" />
          </div>
          <OrderSummary quote={q} loading={cart.quoting && !q} />
          <label className="flex items-start gap-3 text-xs leading-relaxed text-plum-600">
            <input type="checkbox" required checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-plum" />
            <span>{t("أوافق على ", "I agree to the ")}<Link href="/pages/terms" className="underline" target="_blank">{t("الشروط والأحكام", "terms")}</Link>{t(" و", " and ")}<Link href="/pages/returns" className="underline" target="_blank">{t("سياسة الاسترجاع", "returns policy")}</Link>.</span>
          </label>
          {formError && <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{errorLabel(l, formError)}</p>}
          {q?.errors.filter((e) => e !== "NOT_SERVICEABLE").map((e) => <p key={e} role="alert" className="text-sm text-danger">{errorLabel(l, e)}</p>)}
          <button type="submit" disabled={!canSubmit} className="btn-primary h-14 w-full text-[15px]">
            {submitting ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-ivory/30 border-t-ivory" aria-label={t("جارٍ الإرسال", "Submitting")} />
              : f.paymentMethod === "CARD" ? t("المتابعة للدفع الآمن", "Continue to secure payment") : t("تأكيد الطلب", "Place order")}
          </button>
          {!agreed && <p className="text-center text-xs text-plum-500">{t("يُرجى الموافقة على الشروط لإتمام الطلب.", "Please accept the terms to place your order.")}</p>}
        </aside>
      </form>
    </div>
  );
}

function PayOption({ checked, disabled, onSelect, icon, title, desc }: {
  checked: boolean; disabled: boolean; onSelect: () => void; icon: "cash" | "card"; title: string; desc: string;
}) {
  return (
    <button type="button" role="radio" aria-checked={checked} disabled={disabled} onClick={onSelect}
      className={cn("flex items-start gap-4 rounded-2xl border p-5 text-start transition", checked && !disabled ? "border-plum bg-white shadow-soft" : "border-ivory-300 bg-white/50 hover:border-plum/50", disabled && "cursor-not-allowed opacity-60")}>
      <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border", checked && !disabled ? "border-plum" : "border-plum/30")}>
        {checked && !disabled && <span className="h-2.5 w-2.5 rounded-full bg-plum" />}
      </span>
      <span className="flex-1">
        <span className="flex items-center gap-2 font-semibold"><Icon name={icon} className="h-5 w-5 text-gold-600" />{title}</span>
        <span className="mt-1 block text-sm text-plum-600">{desc}</span>
      </span>
    </button>
  );
}
