import { requireAdminPage } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";
import { activeProviderInfo } from "@/lib/services/payments";
import { channelStatus } from "@/lib/services/notifications";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { Badge, Check, Field, Notice, PageHeader, Panel, Select, TextArea } from "@/components/admin/ui";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdminPage("settings.manage");
  const [t, s] = await Promise.all([getT(), getSettings()]);
  const pay = activeProviderInfo();
  const ch = channelStatus();
  const save = t("حفظ", "Save");
  const status = (ok: boolean) => <Badge tone={ok ? "success" : "warning"}>{ok ? t("مُعدّ", "Configured") : t("غير مُعدّ", "Not configured")}</Badge>;

  return (
    <>
      <PageHeader title={t("الإعدادات", "Settings")} description={t("الأسرار (مفاتيح البوابات والبريد) تُضبط كمتغيرات بيئة على الخادم فقط ولا تُعرض هنا.", "Secrets (gateway and email keys) are server-side environment variables only and are never shown here.")} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title={t("بيانات المتجر", "Store details")}>
          <SettingsForm k="store" label={save}>
            <Field label={t("الاسم (ع)", "Name (AR)")} name="nameAr" defaultValue={s.store.nameAr} />
            <Field label={t("الاسم (EN)", "Name (EN)")} name="nameEn" defaultValue={s.store.nameEn} ltr />
            <Field label={t("الشعار (ع)", "Tagline (AR)")} name="taglineAr" defaultValue={s.store.taglineAr} />
            <Field label={t("الشعار (EN)", "Tagline (EN)")} name="taglineEn" defaultValue={s.store.taglineEn} ltr />
            <Field label={t("البريد", "Email")} name="email" type="email" defaultValue={s.store.email} ltr />
            <Field label={t("الهاتف", "Phone")} name="phone" defaultValue={s.store.phone} ltr />
            <Field label={t("واتساب (رقم)", "WhatsApp number")} name="whatsapp" defaultValue={s.store.whatsapp} ltr placeholder="0599…" />
            <Field label={t("العملة", "Currency")} name="currency" defaultValue={s.store.currency} ltr readOnly hint={t("الشيكل حالياً (ILS)", "Shekel (ILS) for now")} />
            <Field label={t("العنوان (ع)", "Address (AR)")} name="addressAr" defaultValue={s.store.addressAr} />
            <Field label={t("العنوان (EN)", "Address (EN)")} name="addressEn" defaultValue={s.store.addressEn} ltr />
            <Select label={t("اللغة الافتراضية", "Default language")} name="defaultLocale" defaultValue={s.store.defaultLocale} options={[{ value: "ar", label: "العربية" }, { value: "en", label: "English" }]} />
            <Field label={t("رابط الشعار (اختياري)", "Logo URL (optional)")} name="logoUrl" defaultValue={s.store.logoUrl} ltr />
          </SettingsForm>
        </Panel>

        <Panel title={t("الدفع", "Payments")}>
          <div className="mb-4 space-y-2 text-sm">
            <p className="flex items-center justify-between">{t("بوابة الدفع بالبطاقة", "Card payment gateway")} {status(pay.configured)}</p>
            {pay.key && <p className="text-xs text-plum-500">PAYMENT_PROVIDER = <span className="font-mono">{pay.key}</span>{pay.sandbox && " (sandbox)"}</p>}
            {!pay.configured && <Notice>{t("الدفع بالبطاقة لن يظهر للعملاء كخيار متاح حتى يُضبط مزوّد معتمد بمفاتيح حقيقية ويُختبر بالكامل. راجعي DEPLOYMENT.md.", "Card payment stays unavailable to customers until an approved provider is configured with real credentials and fully tested. See DEPLOYMENT.md.")}</Notice>}
          </div>
          <SettingsForm k="payments" label={save}>
            <Check label={t("تفعيل الدفع عند الاستلام", "Enable cash on delivery")} name="codEnabled" defaultChecked={s.payments.codEnabled} />
            <Check label={t("تفعيل الدفع بالبطاقة (يتطلب بوابة مُعدّة)", "Enable card payment (requires a configured gateway)")} name="cardEnabled" defaultChecked={s.payments.cardEnabled} />
            <Select label={t("التاجر المسجّل (يستلم الأموال)", "Merchant of record (receives funds)")} name="merchantOfRecord" defaultValue={s.payments.merchantOfRecord} options={[{ value: "PARTNER", label: t("الشريك التجاري", "Retail partner") }, { value: "DELLA", label: "DELLA" }]} />
          </SettingsForm>
        </Panel>

        <Panel title={t("العمولة الافتراضية", "Default commission")}>
          <p className="mb-3 text-xs text-plum-500">{t("تُستخدم فقط إذا لم يكن للمنتج أو الشريك قاعدة خاصة.", "Used only when neither the product nor the partner has its own rule.")}</p>
          <SettingsForm k="commission" label={save}>
            <Select label={t("النوع", "Type")} name="defaultType" defaultValue={s.commission.defaultType} options={[{ value: "PERCENT", label: "%" }, { value: "FIXED", label: t("₪ لكل قطعة", "₪ per unit") }]} />
            <Field label={t("القيمة", "Value")} name="defaultValue" defaultValue={s.commission.defaultValue / 100} inputMode="decimal" ltr />
          </SettingsForm>
        </Panel>

        <Panel title={t("الإشعارات", "Notifications")}>
          <div className="mb-4 space-y-2 text-sm">
            <p className="flex items-center justify-between">{t("البريد الإلكتروني (Resend)", "Email (Resend)")} {status(ch.email)}</p>
            <p className="flex items-center justify-between">{t("واتساب (Cloud API)", "WhatsApp (Cloud API)")} {status(ch.whatsapp)}</p>
            <p className="text-xs text-plum-500">{t("عند عدم الإعداد تُسجَّل الرسائل كـ«غير مُرسلة — القناة غير مُعدّة» ولا يُدّعى إرسالها.", "When not configured, messages are logged as “not sent — channel not configured”; nothing is claimed as sent.")}</p>
          </div>
          <SettingsForm k="notifications" label={save}>
            <Field label={t("بريد الإدارة", "Admin email")} name="adminEmail" type="email" defaultValue={s.notifications.adminEmail} ltr />
            <div />
            <Check label={t("إرسال بريد للعملاء", "Email customers")} name="emailCustomers" defaultChecked={s.notifications.emailCustomers} />
            <Check label={t("إرسال واتساب للعملاء", "WhatsApp customers")} name="whatsappCustomers" defaultChecked={s.notifications.whatsappCustomers} />
            <Check label={t("تنبيهات المخزون المنخفض", "Low-stock alerts")} name="lowStockAlerts" defaultChecked={s.notifications.lowStockAlerts} />
          </SettingsForm>
        </Panel>

        <Panel title={t("الكتالوج", "Catalog")}>
          <SettingsForm k="catalog" label={save}>
            <Check label={t("إظهار تنبيه المنتجات التجريبية", "Show demo-product notice")} name="showDemoNotice" defaultChecked={s.catalog.showDemoNotice} />
            <Field label={t("أقصى كمية لكل منتج في الطلب", "Max quantity per item per order")} name="maxQtyPerItem" type="number" defaultValue={s.catalog.maxQtyPerItem} />
          </SettingsForm>
        </Panel>

        <Panel title="SEO">
          <SettingsForm k="seo" label={save}>
            <Field label={t("عنوان الموقع (ع)", "Site title (AR)")} name="titleAr" defaultValue={s.seo.titleAr} />
            <Field label={t("عنوان الموقع (EN)", "Site title (EN)")} name="titleEn" defaultValue={s.seo.titleEn} ltr />
            <TextArea label={t("الوصف (ع)", "Description (AR)")} name="descAr" defaultValue={s.seo.descAr} />
            <TextArea label={t("الوصف (EN)", "Description (EN)")} name="descEn" defaultValue={s.seo.descEn} dir="ltr" />
          </SettingsForm>
        </Panel>

        <Panel title={t("السياسات المختصرة", "Short policies")} className="xl:col-span-2">
          <p className="mb-3 text-xs text-plum-500">{t("النصوص الكاملة تُحرَّر من صفحة محتوى الموقع.", "Full policy pages are edited under Site content.")}</p>
          <SettingsForm k="policies" label={save}>
            <TextArea label={t("الضمان (ع)", "Warranty (AR)")} name="warrantyAr" defaultValue={s.policies.warrantyAr} />
            <TextArea label={t("الضمان (EN)", "Warranty (EN)")} name="warrantyEn" defaultValue={s.policies.warrantyEn} dir="ltr" />
            <TextArea label={t("الاسترجاع (ع)", "Returns (AR)")} name="returnsAr" defaultValue={s.policies.returnsAr} />
            <TextArea label={t("الاسترجاع (EN)", "Returns (EN)")} name="returnsEn" defaultValue={s.policies.returnsEn} dir="ltr" />
            <TextArea label={t("التوصيل (ع)", "Delivery (AR)")} name="deliveryAr" defaultValue={s.policies.deliveryAr} />
            <TextArea label={t("التوصيل (EN)", "Delivery (EN)")} name="deliveryEn" defaultValue={s.policies.deliveryEn} dir="ltr" />
          </SettingsForm>
        </Panel>
      </div>
    </>
  );
}
