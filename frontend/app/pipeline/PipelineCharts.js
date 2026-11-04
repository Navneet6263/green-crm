"use client";

import { useEffect, useRef, useState } from "react";
import { colorFor } from "../../components/dashboard/home/widgetCatalog";
import { compact, money } from "../analytics/analytics-utils";
import { COLORS } from "../analytics/server-analytics";

const LEADS = "#009a8c";
const WON = "#3b6fd8";
const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);
const day = (iso, unit) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", unit === "month" ? { month: "short", year: "2-digit", timeZone: "UTC" } : { day: "numeric", month: "short", timeZone: "UTC" });
const initials = (name = "") => String(name).split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";

function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(260, Math.round(entry.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

const niceMax = (v) => { if (v <= 4) return 4; const p = 10 ** Math.floor(Math.log10(v)); return Math.ceil(v / p) * p; };

/** Leads created and won over the period, with a crosshair tooltip. */
export function TrendChart({ series }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const H = 220, L = 34, R = 10, T = 12, B = 26;
  const n = series.length;
  const max = niceMax(Math.max(1, ...series.map((p) => p.leads)));
  const x = (i) => L + (n <= 1 ? 0 : (i / (n - 1)) * (width - L - R));
  const y = (v) => T + (1 - v / max) * (H - T - B);
  const line = (key) => series.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");
  const area = n ? `${line("leads")} L${x(n - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z` : "";
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((width - L) / 70))));
  const unit = series[0]?.unit;
  const pick = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - box.left - L) / Math.max(1, width - L - R)) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  };
  const p = hover !== null ? series[hover] : null;

  if (!n) return <p className="py-16 text-center text-[13px] text-slate-400">No leads in this period.</p>;
  return (
    <div ref={ref} className="relative">
      <svg width={width} height={H} role="img" aria-label="Leads created and won over time" onMouseMove={pick} onMouseLeave={() => setHover(null)} className="block">
        <defs>
          <linearGradient id="pl-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={LEADS} stopOpacity="0.22" /><stop offset="100%" stopColor={LEADS} stopOpacity="0" /></linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={width - R} y1={y(t)} y2={y(t)} className="stroke-slate-200" strokeDasharray={t ? "3 4" : undefined} />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" className="fill-slate-400 text-[10.5px]">{compact(t)}</text>
          </g>
        ))}
        {series.map((pt, i) => (i % labelEvery === 0 || i === n - 1) && (i === n - 1 || n - 1 - i >= labelEvery / 2) ? (
          <text key={pt.date} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="fill-slate-400 text-[10.5px]">{day(pt.date, unit)}</text>
        ) : null)}
        <path d={area} fill="url(#pl-area)" />
        <path d={line("leads")} fill="none" stroke={LEADS} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <path d={line("closed")} fill="none" stroke={WON} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {p ? (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={T} y2={y(0)} className="stroke-slate-300" />
            <circle cx={x(hover)} cy={y(p.leads)} r="4.5" fill={LEADS} className="stroke-white" strokeWidth="2" />
            <circle cx={x(hover)} cy={y(p.closed)} r="4.5" fill={WON} className="stroke-white" strokeWidth="2" />
          </g>
        ) : null}
      </svg>
      {p ? (
        <div className="pointer-events-none absolute top-2 z-10 w-44 rounded-[10px] bg-white px-3 py-2 text-[12px] shadow-lg ring-1 ring-slate-200"
          style={{ left: Math.min(Math.max(x(hover) - 88, 0), width - 176) }}>
          <p className="font-semibold text-slate-900">{unit === "week" ? `Week of ${day(p.date)}` : day(p.date, unit)}</p>
          <p className="mt-1 flex justify-between text-slate-600"><span><i className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: LEADS }} />Leads</span><b className="text-slate-900">{p.leads}</b></p>
          <p className="flex justify-between text-slate-600"><span><i className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: WON }} />Won</span><b className="text-slate-900">{p.closed}</b></p>
          <p className="flex justify-between text-slate-600"><span className="pl-3.5">Value</span><b className="text-slate-900">{money(p.value)}</b></p>
        </div>
      ) : null}
    </div>
  );
}

const STATUS_ORDER = ["new", "pending", "contacted", "qualified", "booked-demo", "demo-done", "trial-started", "proposal", "negotiation", "on-hold", "closed-won", "closed-lost"];
const statusColor = (key) => (key === "closed-won" ? "bg-emerald-500" : key === "closed-lost" ? "bg-rose-400" : "bg-brand-500");

/** Leads by status, in pipeline order: count, share and value. */
export function StatusFunnel({ items, total }) {
  const rank = (k) => { const i = STATUS_ORDER.indexOf(k); return i < 0 ? 99 : i; };
  const rows = [...items].sort((a, b) => rank(a.key) - rank(b.key));
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="py-10 text-center text-[13px] text-slate-400">No leads in this period.</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.key} title={`${r.label}: ${r.value} leads · ${money(r.amount)}`} className="grid grid-cols-[110px_minmax(0,1fr)_74px] items-center gap-3">
          <span className="truncate text-[12.5px] font-medium text-slate-600">{r.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-slate-100"><span className={`block h-full rounded-full ${statusColor(r.key)}`} style={{ width: `${Math.max(3, (r.value / max) * 100)}%` }} /></span>
          <span className="text-right text-[12.5px] tabular-nums"><b className="font-semibold text-slate-900">{r.value}</b> <span className="text-slate-400">{pct(r.value, total)}%</span></span>
        </li>
      ))}
    </ul>
  );
}

const STAGES = [["sales", "Sales", COLORS[1]], ["legal", "Legal", COLORS[4]], ["finance", "Finance", COLORS[3]], ["completed", "Completed", COLORS[0]]];

/** Sales → Legal → Finance → Completed, with how many leads and how much value sits in each. */
export function StageFlow({ items }) {
  const by = Object.fromEntries(items.map((r) => [r.key, r]));
  const total = items.reduce((s, r) => s + r.value, 0);
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {STAGES.map(([key, name, color], i) => {
        const r = by[key] || { value: 0, amount: 0 };
        return (
          <div key={key} className="relative rounded-[12px] bg-slate-50 px-3.5 py-3 ring-1 ring-slate-100">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500"><i className="h-2 w-2 rounded-full" style={{ background: color }} />{name}</p>
            <p className="mt-1.5 text-[22px] font-bold leading-none tabular-nums text-slate-900">{compact(r.value)}</p>
            <p className="mt-1 truncate text-[11.5px] text-slate-500">{money(r.amount)}</p>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full" style={{ width: `${pct(r.value, total)}%`, background: color }} /></div>
            <p className="mt-1 text-[11px] text-slate-400">{pct(r.value, total)}% of leads</p>
            {i < STAGES.length - 1 ? <span className="absolute -right-2 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 place-items-center rounded-full bg-white text-[10px] text-slate-400 ring-1 ring-slate-200 lg:grid">›</span> : null}
          </div>
        );
      })}
    </div>
  );
}

/** Lead sources as a donut (top 5, the rest as Other) with a legend. */
export function SourceDonut({ items }) {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, 5);
  const rest = sorted.slice(5);
  const rows = rest.length ? [...top, { key: "other", label: "Other", value: rest.reduce((s, r) => s + r.value, 0), won: rest.reduce((s, r) => s + r.won, 0) }] : top;
  const total = rows.reduce((s, r) => s + r.value, 0);
  const R = 54, C = 2 * Math.PI * R;
  let offset = 0;
  const color = (i, key) => (key === "other" ? "#94a3b8" : COLORS[i % COLORS.length]);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center xl:flex-col">
      <svg width="150" height="150" viewBox="0 0 150 150" role="img" aria-label="Lead sources" className="shrink-0">
        <circle cx="75" cy="75" r={R} fill="none" className="stroke-slate-100" strokeWidth="18" />
        {total ? rows.map((r, i) => {
          const len = (r.value / total) * C;
          const seg = <circle key={r.key} cx="75" cy="75" r={R} fill="none" stroke={color(i, r.key)} strokeWidth="18" strokeDasharray={`${Math.max(0, len - 2)} ${C}`} strokeDashoffset={-offset} transform="rotate(-90 75 75)"><title>{`${r.label}: ${r.value}`}</title></circle>;
          offset += len;
          return seg;
        }) : null}
        <text x="75" y="72" textAnchor="middle" className="fill-slate-900 text-[22px] font-bold">{compact(total)}</text>
        <text x="75" y="90" textAnchor="middle" className="fill-slate-400 text-[11px]">leads</text>
      </svg>
      <ul className="w-full min-w-0 space-y-1.5">
        {rows.map((r, i) => (
          <li key={r.key} className="flex items-center gap-2 text-[12.5px]">
            <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color(i, r.key) }} />
            <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{r.label}</span>
            <span className="tabular-nums text-slate-400">{pct(r.value, total)}%</span>
            <b className="w-9 text-right font-semibold tabular-nums text-slate-900">{r.value}</b>
          </li>
        ))}
        {!rows.length ? <li className="text-[13px] text-slate-400">No sources yet.</li> : null}
      </ul>
    </div>
  );
}

/** Owners ranked by leads: won, conversion and open pipeline. */
export function OwnerTable({ owners }) {
  if (!owners.length) return <p className="py-10 text-center text-[13px] text-slate-400">No owners in this period.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-[13px]">
        <thead className="text-[11.5px] font-semibold text-slate-500">
          <tr className="border-b border-slate-100"><th className="py-2 pl-1 pr-3">Owner</th><th className="px-3 py-2 text-right">Leads</th><th className="px-3 py-2 text-right">Won</th><th className="px-3 py-2">Conversion</th><th className="px-3 py-2 text-right">Open pipeline</th><th className="py-2 pl-3 pr-1 text-right">Won value</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {owners.map((o, i) => {
            const rate = pct(o.won, o.leads);
            return (
              <tr key={o.key || o.label} className="hover:bg-slate-50">
                <td className="py-2.5 pl-1 pr-3">
                  <span className="flex items-center gap-2.5">
                    <span className="w-4 text-[11px] font-semibold text-slate-400">{i + 1}</span>
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10.5px] font-bold text-white" style={{ background: o.key === "unassigned" ? "#94a3b8" : colorFor(o.key || o.label) }}>{initials(o.label)}</span>
                    <b className="truncate font-semibold text-slate-900">{o.label}</b>
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">{o.leads}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{o.won}</td>
                <td className="px-3 py-2.5"><span className="flex items-center gap-2"><span className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-brand-500" style={{ width: `${rate}%` }} /></span><span className="tabular-nums text-slate-600">{rate}%</span></span></td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{money(o.openValue)}</td>
                <td className="py-2.5 pl-3 pr-1 text-right tabular-nums text-slate-700">{money(o.wonValue)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
