"use client";
import { useActionState, useState } from "react";
import { addAddress, updateProfile } from "@/app/actions/account";
import { useT } from "@/lib/i18n/client";
import { errorLabel } from "@/lib/i18n/shared";
import { cn } from "@/lib/utils";

type S = { error?: string; fields?: Record<string, string>; ok?: boolean } | undefined;
type Gov = { id: string; nameAr: string; nameEn: string; localities: { id: string; nameAr: string; nameEn: string }[] };

export function ProfileForm({ name, phone, email }: { name: string; phone: string; email: string }) {
  const t = useT();
  const [state, action, pending] = useActionState(updateProfile, undefined);
  const e = (k: string) => state?.fields?.[k] && <p className="mt-1 text-xs text-danger">{errorLabel(t.locale, state.fields[k])}</p>;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div><label className="label" htmlFor="pname">{t("الاسم", "Name")}</label><input id="pname" name="name" defaultValue={name} className="field" />{e("name")}</div>
      <div><label className="label" htmlFor="pphone">{t("الجوال", "Mobile")}</label><input id="pphone" name="phone" defaultValue={phone} dir="ltr" className="field text-start" />{e("phone")}</div>
      <div className="sm:col-span-2"><label className="label">{t("البريد الإلكتروني", "Email")}</label><input value={email} disabled dir="ltr" className="field text-start opacity-60" /></div>
      <div className="flex items-center gap-4 sm:col-span-2">
        <button disabled={pending} className="btn-primary">{t("حفظ", "Save")}</button>
        {state?.ok && <span role="status" className="text-sm text-success">{t("تم الحفظ", "Saved")}</span>}
      </div>
    </form>
  );
}

export function AddressForm({ governorates }: { governorates: Gov[] }) {
  const t = useT();
  const l = t.locale;
  const [state, action, pending] = useActionState(addAddress, undefined);
  const [gov, setGov] = useState("");
  const g = governorates.find((x) => x.id === gov);
  const e = (k: string) => state?.fields?.[k] && <p className="mt-1 text-xs text-danger">{errorLabel(l, state.fields[k])}</p>;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" key={state?.ok ? Date.now() : "f"}>
      <div><label className="label" htmlFor="alabel">{t("اسم العنوان (البيت، العمل…)", "Label (Home, Work…)")}</label><input id="alabel" name="label" className="field" /></div>
      <div><label className="label" htmlFor="afull">{t("اسم المستلمة", "Recipient name")}</label><input id="afull" name="fullName" className={cn("field", state?.fields?.fullName && "field-error")} />{e("fullName")}</div>
      <div><label className="label" htmlFor="aphone">{t("الجوال", "Mobile")}</label><input id="aphone" name="phone" dir="ltr" className={cn("field text-start", state?.fields?.phone && "field-error")} />{e("phone")}</div>
      <div>
        <label className="label" htmlFor="agov">{t("المحافظة", "Governorate")}</label>
        <select id="agov" className="field" value={gov} onChange={(ev) => setGov(ev.target.value)}>
          <option value="">{t("اختاري", "Select")}</option>
          {governorates.map((x) => <option key={x.id} value={x.id}>{l === "ar" ? x.nameAr : x.nameEn}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="aloc">{t("المدينة / البلدة", "City / village")}</label>
        <select id="aloc" name="localityId" className={cn("field", state?.fields?.localityId && "field-error")} disabled={!g}>
          <option value="">{t("اختاري", "Select")}</option>
          {g?.localities.map((x) => <option key={x.id} value={x.id}>{l === "ar" ? x.nameAr : x.nameEn}</option>)}
        </select>{e("localityId")}
      </div>
      <div><label className="label" htmlFor="astreet">{t("الحي / الشارع", "Street")}</label><input id="astreet" name="street" className={cn("field", state?.fields?.street && "field-error")} />{e("street")}</div>
      <div className="sm:col-span-2"><label className="label" htmlFor="adet">{t("التفاصيل", "Details")}</label><input id="adet" name="details" className={cn("field", state?.fields?.details && "field-error")} />{e("details")}</div>
      <div className="sm:col-span-2"><label className="label" htmlFor="aland">{t("معلم قريب", "Landmark")}</label><input id="aland" name="landmark" className="field" /></div>
      {state?.error && <p className="text-sm text-danger sm:col-span-2">{errorLabel(l, state.error)}</p>}
      <div className="sm:col-span-2"><button disabled={pending} className="btn-primary">{t("إضافة العنوان", "Add address")}</button></div>
    </form>
  );
}
