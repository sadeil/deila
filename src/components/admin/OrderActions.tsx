"use client";
import { useState } from "react";
import { addNote, changeStatus, recordCod, refund, updateDelivery } from "@/app/admin/actions/orders";
import { useT } from "@/lib/i18n/client";
import { statusLabel } from "@/lib/i18n/shared";
import { cn } from "@/lib/utils";
import { ActionForm, ConfirmButton } from "./ActionForm";

type Props = {
  orderId: string;
  allowed: string[];
  canManage: boolean;
  canRefund: boolean;
  codCollectable: boolean;
  refundable: number; // agorot still refundable
  couriers: { id: string; name: string }[];
  delivery: { trackingRef: string | null; courierId: string | null; courierNotes: string | null };
};

const PRIMARY: Record<string, string> = { CONFIRMED: "btn-primary", PREPARING: "btn-primary", SHIPPED: "btn-primary", OUT_FOR_DELIVERY: "btn-primary", DELIVERED: "btn-primary" };

export function StatusActions({ orderId, allowed, couriers }: Pick<Props, "orderId" | "allowed" | "couriers">) {
  const t = useT();
  const l = t.locale;
  const [to, setTo] = useState<string | null>(null);
  if (!allowed.length) return <p className="text-sm text-plum-500">{t("لا إجراءات متاحة — الطلب في حالة نهائية.", "No further actions — the order is in a final state.")}</p>;
  const needsNote = to === "CANCELED" || to === "RETURNED";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {allowed.map((s) => (
          <button key={s} type="button" onClick={() => setTo(s)}
            className={cn("btn-sm h-9", to === s ? "btn-primary" : s === "CANCELED" || s === "RETURNED" ? "btn-secondary border-danger/40 text-danger hover:bg-danger hover:text-white" : PRIMARY[s] ? "btn-secondary" : "btn-secondary")}>
            → {statusLabel(l, s)}
          </button>
        ))}
      </div>
      {to && (
        <ActionForm action={changeStatus} className="space-y-3 rounded-xl bg-ivory-100 p-4" onSuccess={() => setTo(null)} success={t("تم تحديث الحالة", "Status updated")}>
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="to" value={to} />
          {to === "SHIPPED" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">{t("رقم التتبع", "Tracking reference")}</label><input name="trackingRef" dir="ltr" className="field h-10 text-sm" /></div>
              <div><label className="label">{t("شركة التوصيل", "Courier")}</label>
                <select name="courierId" className="field h-10 text-sm"><option value="">—</option>{couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              </div>
            </div>
          )}
          {to === "RETURNED" && (
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="restock" defaultChecked className="accent-plum" />{t("إعادة الكمية للمخزون", "Return quantity to stock")}</label>
          )}
          <div>
            <label className="label">{needsNote ? t("السبب (مطلوب)", "Reason (required)") : t("ملاحظة (اختياري)", "Note (optional)")}</label>
            <input name="note" required={needsNote} className="field h-10 text-sm" />
          </div>
          <div className="flex gap-2">
            <ConfirmButton message={t(`تأكيد تغيير الحالة إلى "${statusLabel(l, to)}"؟`, `Change status to "${statusLabel(l, to)}"?`)} className="btn-primary btn-sm h-9">{t("تأكيد", "Confirm")}</ConfirmButton>
            <button type="button" onClick={() => setTo(null)} className="btn-ghost btn-sm h-9">{t("إلغاء", "Cancel")}</button>
          </div>
        </ActionForm>
      )}
    </div>
  );
}

export function CodForm({ orderId }: { orderId: string }) {
  const t = useT();
  return (
    <ActionForm action={recordCod} className="flex flex-wrap items-end gap-2" success={t("تم تسجيل التحصيل", "Collection recorded")}>
      <input type="hidden" name="orderId" value={orderId} />
      <div className="flex-1">
        <label className="label">{t("تم التحصيل بواسطة", "Collected by")}</label>
        <select name="collectedBy" className="field h-10 text-sm">
          <option value="PARTNER">{t("الشريك التجاري", "Retail partner")}</option>
          <option value="COURIER">{t("شركة التوصيل", "Courier")}</option>
          <option value="DELLA">{t("ديلا", "DELLA")}</option>
        </select>
      </div>
      <ConfirmButton message={t("تأكيد استلام المبلغ نقداً؟", "Confirm the cash was collected?")} className="btn-primary btn-sm h-10">{t("تسجيل الدفع", "Record payment")}</ConfirmButton>
    </ActionForm>
  );
}

export function RefundForm({ orderId, max }: { orderId: string; max: number }) {
  const t = useT();
  return (
    <ActionForm action={refund} className="grid gap-2 sm:grid-cols-[120px_1fr_auto] sm:items-end" success={t("تمت معالجة الاسترداد", "Refund processed")}>
      <input type="hidden" name="orderId" value={orderId} />
      <div><label className="label">{t("المبلغ ₪", "Amount ₪")}</label><input name="amount" inputMode="decimal" defaultValue={(max / 100).toFixed(2)} dir="ltr" className="field h-10 text-sm" /></div>
      <div><label className="label">{t("السبب", "Reason")}</label><input name="reason" required minLength={3} className="field h-10 text-sm" /></div>
      <ConfirmButton message={t("تنفيذ الاسترداد؟ لا يمكن التراجع.", "Process this refund? This cannot be undone.")} className="btn-secondary btn-sm h-10 border-danger/40 text-danger">{t("استرداد", "Refund")}</ConfirmButton>
    </ActionForm>
  );
}

export function DeliveryForm({ orderId, couriers, delivery }: Pick<Props, "orderId" | "couriers" | "delivery">) {
  const t = useT();
  return (
    <ActionForm action={updateDelivery} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="orderId" value={orderId} />
      <div><label className="label">{t("رقم التتبع", "Tracking reference")}</label><input name="trackingRef" defaultValue={delivery.trackingRef ?? ""} dir="ltr" className="field h-10 text-sm" /></div>
      <div><label className="label">{t("شركة التوصيل", "Courier")}</label>
        <select name="courierId" defaultValue={delivery.courierId ?? ""} className="field h-10 text-sm"><option value="">—</option>{couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </div>
      <div className="sm:col-span-2"><label className="label">{t("ملاحظات المندوب", "Courier notes")}</label><input name="courierNotes" defaultValue={delivery.courierNotes ?? ""} className="field h-10 text-sm" /></div>
      <div><button className="btn-secondary btn-sm h-9">{t("حفظ", "Save")}</button></div>
    </ActionForm>
  );
}

export function NoteForm({ orderId }: { orderId: string }) {
  const t = useT();
  return (
    <ActionForm action={addNote} resetOnSuccess className="flex gap-2" success={t("أُضيفت الملاحظة", "Note added")}>
      <input type="hidden" name="orderId" value={orderId} />
      <input name="body" required placeholder={t("ملاحظة داخلية…", "Internal note…")} className="field h-10 flex-1 text-sm" />
      <button className="btn-primary btn-sm h-10">{t("إضافة", "Add")}</button>
    </ActionForm>
  );
}
