"use client";

import { compact, money } from "./analytics-utils";

const K = "text-[10px] font-bold uppercase tracking-widest text-slate-400";

// ── Trend Bar Chart ──────────────────────────────────────────────────────────
export function TrendChart({ trend }) {
  const maxLeads = Math.max(...trend.map(t => t.leads || 0), 1);
  const maxValue = Math.max(...trend.map(t => t.value || 0), 1);

  return (
    <div>
      {/* Bar chart */}
      <div className="flex items-end gap-2 h-36">
        {trend.map((item, i) => {
          const leadsH = Math.max(4, Math.round((item.leads / maxLeads) * 100));
          const closedH = Math.max(0, Math.round((item.closed / maxLeads) * 100));
          return (
            <div key={i} className="group flex flex-1 flex-col items-center gap-1">
              <div className="relative flex w-full flex-col items-center justify-end" style={{ height: "120px" }}>
                {/* Leads bar */}
                <div
                  className="w-full rounded-t-lg bg-amber-200 transition-all duration-500 group-hover:bg-amber-300"
                  style={{ height: `${leadsH}%` }}
                  title={`${item.leads} leads`}
                />
                {/* Closed overlay */}
                {item.closed > 0 ? (
                  <div
                    className="absolute bottom-0 w-full rounded-t-lg bg-emerald-400 transition-all duration-500"
                    style={{ height: `${closedH}%` }}
                    title={`${item.closed} closed`}
                  />
                ) : null}
              </div>
              <span className="text-[10px] font-semibold text-slate-400">{item.label}</span>
            </div>
          );
        })}
      </div>

      {/* Legend + summary row */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-50 pt-3">
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-200" />Leads</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />Closed</span>
        </div>
        <div className="flex gap-4 text-xs text-slate-400">
          <span>Total: <strong className="text-slate-700">{compact(trend.reduce((s,t)=>s+t.leads,0))}</strong></span>
          <span>Value: <strong className="text-slate-700">{money(trend.reduce((s,t)=>s+t.value,0))}</strong></span>
        </div>
      </div>

      {/* Data table */}
      <div className="mt-3 space-y-1.5">
        {trend.map((item, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-50 bg-slate-50 px-3 py-2">
            <span className="w-10 text-xs font-semibold text-slate-500">{item.label}</span>
            <div className="flex-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${Math.max(4, Math.round((item.leads/maxLeads)*100))}%` }} />
              </div>
            </div>
            <span className="w-8 text-right text-xs font-bold text-slate-700">{item.leads}</span>
            <span className="w-8 text-right text-xs font-semibold text-emerald-600">{item.closed}</span>
            <span className="hidden w-24 text-right text-xs text-slate-400 sm:block">{money(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Source Donut ─────────────────────────────────────────────────────────────
const RICH_COLORS = [
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ef4444", // red
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
];

export function SourceDonut({ sourceMix }) {
  // Override dull colors with rich palette
  const colored = sourceMix.map((item, i) => ({ ...item, color: RICH_COLORS[i % RICH_COLORS.length] }));
  const total = colored.reduce((s, i) => s + i.value, 0);

  // Build conic-gradient with gap between segments
  let cursor = 0;
  const segments = colored.map(item => {
    const deg = total ? (item.value / total) * 356 : 0; // 356 not 360 = tiny gap
    const start = cursor + 0.5;
    cursor += deg + 0.5;
    return `${item.color} ${start}deg ${start + deg}deg`;
  });
  const gradient = segments.join(", ");

  return (
    <div className="space-y-4">
      {/* Donut centred */}
      <div className="flex justify-center">
        <div
          className="relative grid h-48 w-48 place-items-center rounded-full"
          style={{ background: gradient ? `conic-gradient(${gradient})` : "#f1f5f9", boxShadow: "0 4px 24px rgba(0,0,0,0.10)" }}
        >
          {/* Inner white circle */}
          <div className="grid h-[116px] w-[116px] place-items-center rounded-full bg-white text-center" style={{ boxShadow: "inset 0 2px 8px rgba(0,0,0,0.06)" }}>
            <div>
              <strong className="block text-2xl font-bold text-slate-900">{compact(total)}</strong>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">leads</span>
            </div>
          </div>
        </div>
      </div>

      {/* Legend — clean single row per item, no duplicate columns */}
      <div className="space-y-1.5">
        {colored.length ? colored.map(item => {
          const pct = total ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={item.key} className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: item.color }} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">{item.label}</span>
              {/* Progress bar */}
              <div className="w-20 shrink-0">
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(4, pct)}%`, background: item.color }} />
                </div>
              </div>
              <span className="w-7 shrink-0 text-right text-xs font-bold text-slate-500">{pct}%</span>
              <span className="w-6 shrink-0 text-right text-sm font-bold text-slate-900">{item.value}</span>
            </div>
          );
        }) : <p className="text-sm text-slate-400">No source data in this range.</p>}
      </div>
    </div>
  );
}

// ── Status / Workflow Mix Bars ────────────────────────────────────────────────
export function MixBars({ items, title }) {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div>
      <p className={`${K} mb-3`}>{title}</p>
      <div className="space-y-2">
        {items.map(item => {
          const pct = Math.max(6, Math.round((item.value / max) * 100));
          return (
            <div key={item.key} className="flex items-center gap-3">
              <span className="w-24 truncate text-xs font-semibold text-slate-600">{item.label}</span>
              <div className="flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full transition-all duration-500 ${item.tone?.includes("emerald") ? "bg-emerald-400" : item.tone?.includes("amber") ? "bg-amber-400" : item.tone?.includes("violet") ? "bg-violet-400" : item.tone?.includes("sky") ? "bg-sky-400" : "bg-slate-400"}`}
                    style={{ width: `${pct}%` }} />
                </div>
              </div>
              <span className="w-8 text-right text-xs font-bold text-slate-700">{item.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
