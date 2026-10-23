"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useT } from "@/lib/i18n/client";
import { formatMoney } from "@/lib/money";

// Validated (scripts/validate_palette.js, light surface): both pass lightness, chroma, CVD and contrast.
export const SERIES = ["#8E4A80", "#B5793A"] as const;
const AXIS = { fontSize: 11, fill: "#6B5A6E" };
const GRID = "#EDE2DA";

function TooltipBox({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-xl border border-ivory-200 bg-white px-3 py-2 text-xs shadow-soft">
      <p className="mb-1 font-semibold">{title}</p>
      {rows.map(([k, v]) => <p key={k} className="flex justify-between gap-4 text-plum-600"><span>{k}</span><span className="font-semibold tabular-nums text-plum">{v}</span></p>)}
    </div>
  );
}

export function RevenueChart({ data }: { data: { date: string; gross: number; orders: number }[] }) {
  const t = useT();
  const l = t.locale;
  const fmtDate = (d: string) => new Intl.DateTimeFormat(l === "ar" ? "ar-PS-u-nu-latn" : "en-GB", { day: "numeric", month: "short" }).format(new Date(d));
  return (
    <div className="h-72" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="g-rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES[0]} stopOpacity={0.22} />
              <stop offset="100%" stopColor={SERIES[0]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="date" tickFormatter={fmtDate} tick={AXIS} axisLine={false} tickLine={false} minTickGap={24} reversed={l === "ar"} />
          <YAxis tickFormatter={(v) => `₪${Math.round(v / 100)}`} tick={AXIS} axisLine={false} tickLine={false} width={64} orientation={l === "ar" ? "right" : "left"} />
          <Tooltip cursor={{ stroke: "#241A26", strokeDasharray: "3 3" }}
            content={({ active, payload, label }) => active && payload?.length ? (
              <TooltipBox title={fmtDate(String(label))} rows={[[t("القيمة الإجمالية", "Gross value"), formatMoney(Number(payload[0].payload.gross), l)], [t("الطلبات", "Orders"), String(payload[0].payload.orders)]]} />
            ) : null} />
          <Area type="monotone" dataKey="gross" stroke={SERIES[0]} strokeWidth={2} fill="url(#g-rev)" activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HBarChart({ data, valueLabel, money = false, color = SERIES[0] }: {
  data: { name: string; value: number }[]; valueLabel: string; money?: boolean; color?: string;
}) {
  const t = useT();
  const fmt = (v: number) => (money ? formatMoney(v, t.locale) : String(v));
  return (
    <div style={{ height: Math.max(120, data.length * 40) }} dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }} barCategoryGap={8}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" tick={AXIS} axisLine={false} tickLine={false} width={120} />
          <Tooltip cursor={{ fill: "rgba(245,214,228,.35)" }}
            content={({ active, payload }) => active && payload?.length ? <TooltipBox title={String(payload[0].payload.name)} rows={[[valueLabel, fmt(Number(payload[0].value))]]} /> : null} />
          <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} label={{ position: "right", fontSize: 11, fill: "#3B2D3F", formatter: (v: number) => fmt(v) }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Two-category split (e.g. COD vs card) as a single proportional bar with a labelled legend. */
export function SplitBar({ parts }: { parts: { label: string; value: number; sub: string }[] }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  if (!total) return null;
  return (
    <div>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={parts.map((p) => `${p.label} ${Math.round((p.value / total) * 100)}%`).join(", ")}>
        {parts.map((p, i) => p.value > 0 && <span key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: SERIES[i % 2] }} />)}
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {parts.map((p, i) => (
          <li key={p.label} className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[i % 2] }} />
            <span className="flex-1">{p.label}</span>
            <span className="text-plum-500 tabular-nums">{p.sub}</span>
            <span className="w-10 text-end font-semibold tabular-nums">{Math.round((p.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
