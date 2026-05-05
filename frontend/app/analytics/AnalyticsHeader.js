"use client";

import DashboardIcon from "../../components/dashboard/icons";
import { compact, money, titleize } from "./analytics-utils";

const K = "text-[10px] font-bold uppercase tracking-widest text-slate-400";
const INPUT = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-50";

const KPI_ACCENT = [
  "border-amber-200 bg-gradient-to-br from-amber-50 to-white",
  "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white",
  "border-sky-200 bg-gradient-to-br from-sky-50 to-white",
  "border-violet-200 bg-gradient-to-br from-violet-50 to-white",
];

export function AnalyticsHeader({ deck, range, filters, onRangeChange, onRefresh, onExport, onFilterChange, onResetFilters }) {
  const hasFilter = Object.values(filters).some(v => v && v !== "all" && v !== "");

  return (
    <div className="space-y-4">
      {/* Title + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={K}>Analytics Desk</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">Pipeline Intelligence</h1>
          <p className="mt-0.5 text-sm text-slate-400">Track health, source mix, and team performance in real time.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Range pills */}
          <div className="flex rounded-xl border border-slate-200 bg-white p-1">
            {["week","month","quarter","year"].map(r => (
              <button key={r} type="button" onClick={() => onRangeChange(r)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${range === r ? "bg-amber-50 text-amber-900 border border-amber-200" : "text-slate-500 hover:text-slate-800"}`}>
                {r}
              </button>
            ))}
          </div>
          <button type="button" onClick={onRefresh} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300">
            <DashboardIcon name="analytics" className="h-4 w-4" />Refresh
          </button>
          <button type="button" onClick={onExport} className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100">
            <DashboardIcon name="documents" className="h-4 w-4" />Export CSV
          </button>
        </div>
      </div>

      {/* Top signal cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {deck.topCards.map((c, i) => (
          <div key={c.label} className={`group relative overflow-hidden rounded-2xl border px-4 py-3.5 transition hover:-translate-y-0.5 hover:shadow-md ${KPI_ACCENT[i]}`}>
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
            <p className={K}>{c.label}</p>
            <p className="mt-1 text-xl font-bold leading-none text-slate-900">{c.value}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">{c.hint}</p>
          </div>
        ))}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {deck.kpis.map((k, i) => (
          <div key={k.label} className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 ${KPI_ACCENT[i]}`}>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white shadow-sm">
              <DashboardIcon name={k.icon} className="h-4 w-4 text-slate-500" />
            </div>
            <div className="min-w-0">
              <p className={K}>{k.label}</p>
              <p className="mt-0.5 text-base font-bold leading-none text-slate-900">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="relative sm:col-span-2 xl:col-span-1">
            <DashboardIcon name="leads" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className={`${INPUT} pl-10`} value={filters.query} onChange={e => onFilterChange("query", e.target.value)} placeholder="Lead, owner, source…" />
          </div>
          {[["owner","owners","All owners"],["priority","priorities","All priorities"],["source","sources","All sources"],["product","products","All products"]].map(([field, optKey, placeholder]) => (
            <select key={field} className={INPUT} value={filters[field]} onChange={e => onFilterChange(field, e.target.value)}>
              <option value="all">{placeholder}</option>
              {deck.filterOptions[optKey]?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ))}
        </div>
        {hasFilter ? (
          <button type="button" onClick={onResetFilters} className="mt-2.5 text-xs font-semibold text-amber-700 hover:text-amber-900">✕ Clear filters</button>
        ) : null}
      </div>
    </div>
  );
}
