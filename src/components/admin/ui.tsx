import Link from "next/link";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "../ui/Icon";

export function PageHeader({ title, description, actions, back }: { title: string; description?: string; actions?: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {back && <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-xs text-plum-500 hover:text-plum"><Icon name="chevron" className="h-3 w-3 rotate-180 flip-rtl" />{back.label}</Link>}
        <h1 className="display text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-plum-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, actions, children, className, pad = true }: { title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={cn("rounded-2xl border border-ivory-200 bg-white", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ivory-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold">{title}</h2>
          {actions}
        </header>
      )}
      <div className={cn(pad && "p-5")}>{children}</div>
    </section>
  );
}

export function Kpi({ label, value, hint, icon, tone = "default" }: { label: string; value: React.ReactNode; hint?: React.ReactNode; icon?: IconName; tone?: "default" | "plum" | "gold" }) {
  return (
    <div className={cn("rounded-2xl border p-5", tone === "plum" ? "border-plum bg-plum text-ivory" : tone === "gold" ? "border-gold/30 bg-gold/10" : "border-ivory-200 bg-white")}>
      <div className="flex items-center justify-between">
        <p className={cn("text-xs font-medium", tone === "plum" ? "text-ivory/70" : "text-plum-500")}>{label}</p>
        {icon && <Icon name={icon} className={cn("h-4 w-4", tone === "plum" ? "text-gold" : "text-plum-400")} />}
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      {hint && <p className={cn("mt-1 text-xs", tone === "plum" ? "text-ivory/60" : "text-plum-500")}>{hint}</p>}
    </div>
  );
}

const TONES = {
  neutral: "bg-ivory-200 text-plum-700",
  info: "bg-blue-50 text-blue-800",
  success: "bg-emerald-50 text-emerald-800",
  warning: "bg-amber-50 text-amber-800",
  danger: "bg-rose-50 text-rose-800",
  plum: "bg-plum text-ivory",
  gold: "bg-gold/15 text-gold-700",
};
export type Tone = keyof typeof TONES;

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold", TONES[tone], className)}>{children}</span>;
}

export const orderTone = (s: string): Tone =>
  ({ PENDING_CONFIRMATION: "warning", CONFIRMED: "info", PREPARING: "info", SHIPPED: "plum", OUT_FOR_DELIVERY: "plum", DELIVERED: "success", CANCELED: "danger", RETURNED: "danger" } as Record<string, Tone>)[s] ?? "neutral";
export const paymentTone = (s: string): Tone =>
  ({ UNPAID: "warning", PENDING: "warning", PAID: "success", FAILED: "danger", REFUNDED: "neutral", PARTIALLY_REFUNDED: "gold" } as Record<string, Tone>)[s] ?? "neutral";
export const commissionTone = (s: string): Tone =>
  ({ PENDING: "warning", APPROVED: "success", PAID: "plum", VOID: "neutral" } as Record<string, Tone>)[s] ?? "neutral";

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[640px] text-sm [&_td]:px-4 [&_td]:py-3 [&_th]:whitespace-nowrap [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-start [&_th]:text-[11px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-plum-500 [&_thead]:border-b [&_thead]:border-ivory-200 [&_thead]:bg-ivory-100/60 [&_tbody_tr]:border-b [&_tbody_tr]:border-ivory-100 [&_tbody_tr:hover]:bg-blush-50/40">
        {children}
      </table>
    </div>
  );
}

export function Empty({ icon = "package", title, children }: { icon?: IconName; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-blush-50"><Icon name={icon} className="h-5 w-5" /></span>
      <p className="mt-4 font-semibold">{title}</p>
      {children && <div className="mt-1 text-sm text-plum-500">{children}</div>}
    </div>
  );
}

export function Notice({ tone = "gold", children, icon = "info" }: { tone?: "gold" | "danger" | "success"; children: React.ReactNode; icon?: IconName }) {
  return (
    <div className={cn("flex items-start gap-3 rounded-xl px-4 py-3 text-sm",
      tone === "gold" && "bg-gold/10 text-gold-700", tone === "danger" && "bg-rose-50 text-rose-800", tone === "success" && "bg-emerald-50 text-emerald-800")}>
      <Icon name={icon} className="mt-0.5 h-4 w-4 shrink-0" /><div>{children}</div>
    </div>
  );
}

export function Field({ label, name, defaultValue, type = "text", required, hint, ltr, className, ...rest }: {
  label: string; name: string; defaultValue?: string | number | null; type?: string; required?: boolean; hint?: string; ltr?: boolean; className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "defaultValue">) {
  return (
    <div className={className}>
      <label htmlFor={`f-${name}`} className="label">{label}{required && " *"}</label>
      <input id={`f-${name}`} name={name} type={type} required={required} defaultValue={defaultValue ?? undefined} dir={ltr ? "ltr" : undefined}
        className={cn("field h-11 text-sm", ltr && "text-start")} {...rest} />
      {hint && <p className="mt-1 text-[11px] text-plum-500">{hint}</p>}
    </div>
  );
}

export function TextArea({ label, name, defaultValue, rows = 3, className, dir }: { label: string; name: string; defaultValue?: string | null; rows?: number; className?: string; dir?: "rtl" | "ltr" }) {
  return (
    <div className={className}>
      <label htmlFor={`f-${name}`} className="label">{label}</label>
      <textarea id={`f-${name}`} name={name} rows={rows} defaultValue={defaultValue ?? undefined} dir={dir} className="field text-sm" />
    </div>
  );
}

export function Check({ label, name, defaultChecked, hint }: { label: string; name: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 h-4 w-4 accent-plum" />
      <span>{label}{hint && <span className="block text-[11px] text-plum-500">{hint}</span>}</span>
    </label>
  );
}

export function Select({ label, name, defaultValue, options, className, required }: {
  label: string; name: string; defaultValue?: string | null; options: { value: string; label: string }[]; className?: string; required?: boolean;
}) {
  return (
    <div className={className}>
      <label htmlFor={`f-${name}`} className="label">{label}{required && " *"}</label>
      <select id={`f-${name}`} name={name} defaultValue={defaultValue ?? ""} required={required} className="field h-11 text-sm">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
