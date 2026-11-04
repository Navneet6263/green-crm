"use client";

import { compact, money } from "./analytics-utils";

const SELECT = "h-9 w-full min-w-0 rounded-[10px] border border-slate-200 bg-white px-2.5 text-[13px] text-slate-800 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-50";
const RANGES = [["week", "7 days"], ["month", "31 days"], ["quarter", "Quarter"], ["year", "Year"]];

/** A tiny line of the period, so a number shows its direction too. */
function Spark({ values, color }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * 76 + 2).toFixed(1)},${(26 - (v / max) * 22).toFixed(1)}`).join(" ");
  return <svg width="80" height="28" aria-hidden="true" className="shrink-0"><polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}

function Stat({ label, value, hint, color, spark }) {
  return (
    <div className="rounded-[14px] bg-white px-4 py-3.5 ring-1 ring-slate-200">
      <p className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500"><i className="h-2 w-2 rounded-full" style={{ background: color }} />{label}</p>
      <div className="mt-1.5 flex items-end justify-between gap-2">
        <p className="min-w-0 break-words text-[18px] font-bold leading-tight tabular-nums tracking-tight text-slate-900 sm:text-[24px] sm:leading-none">{value}</p>
        <Spark values={spark} color={color} />
      </div>
      {hint ? <p className="mt-1.5 truncate text-[11.5px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

/** Period, filters and the four headline numbers for the Insights tab. */
export function AnalyticsHeader({ deck, range, filters, onRangeChange, onRefresh, onFilterChange, onResetFilters, loading }) {
  const hasFilter = Object.values(filters).some((v) => v && v !== "all");
  const t = deck.totals || { leads: 0, won: 0, open: 0, wonValue: 0, openValue: 0, customers: null };
  const series = deck.series || [];
  const customers = t.customers === null || t.customers === undefined ? "" : ` · ${compact(t.customers)} customers`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-[14px] bg-white p-2.5 ring-1 ring-slate-200">
        <div className="flex rounded-[10px] bg-slate-100 p-0.5" role="group" aria-label="Period">
          {RANGES.map(([key, name]) => (
            <button key={key} type="button" onClick={() => onRangeChange(key)} aria-pressed={range === key}
              className={`rounded-[8px] px-3 py-1.5 text-[12.5px] font-semibold transition ${range === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{name}</button>
          ))}
        </div>
        <label className="flex h-9 min-w-[180px] flex-1 items-center gap-2 rounded-[10px] border border-slate-200 bg-slate-50 px-3 text-slate-400 focus-within:border-brand-300 focus-within:bg-white">
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input value={filters.query} onChange={(e) => onFilterChange("query", e.target.value)} placeholder="Search lead, owner or source" aria-label="Search" className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-800 outline-none" />
        </label>
        {[["owner", "owners", "All owners"], ["priority", "priorities", "All priorities"], ["source", "sources", "All sources"], ["product", "products", "All products"]].map(([field, optKey, placeholder]) => (
          <select key={field} className={`${SELECT} sm:w-auto sm:max-w-[170px]`} value={filters[field]} onChange={(e) => onFilterChange(field, e.target.value)} aria-label={placeholder}>
            <option value="all">{placeholder}</option>
            {deck.filterOptions[optKey]?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}
        {hasFilter ? <button type="button" onClick={onResetFilters} className="h-9 rounded-[10px] px-2.5 text-[12.5px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800">Clear</button> : null}
        <button type="button" onClick={onRefresh} aria-label="Refresh" title="Refresh" className="grid h-9 w-9 place-items-center rounded-[10px] text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50">
          <svg className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Leads" value={compact(t.leads)} hint={`${compact(t.open)} still open`} color="#009a8c" spark={series.map((p) => p.leads)} />
        <Stat label="Won" value={compact(t.won)} hint={`${t.leads ? Math.round((t.won / t.leads) * 100) : 0}% of leads`} color="#3b6fd8" spark={series.map((p) => p.closed)} />
        <Stat label="Won value" value={money(t.wonValue)} hint={`Avg deal ${money(t.won ? t.wonValue / t.won : 0)}`} color="#8a55e6" />
        <Stat label="Open pipeline" value={money(t.openValue)} hint={`${deck.sourceMix.length} sources${customers}`} color="#b98300" />
      </div>
    </div>
  );
}
