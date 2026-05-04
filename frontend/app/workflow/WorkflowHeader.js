"use client";

import Link from "next/link";
import DashboardIcon from "../../components/dashboard/icons";
import { T, Pill, STAGE_PILL, STATUS_PILL } from "./workflow-tokens";
import { compact, money, titleize } from "./workflow-utils";

function StatChip({ label, value, hint, accent }) {
  return (
    <div className={`flex flex-col gap-1 rounded-2xl border px-4 py-3.5 ${accent || "border-slate-100 bg-white"}`}>
      <p className={T.kicker}>{label}</p>
      <p className="text-xl font-bold leading-none text-slate-900">{value}</p>
      {hint ? <p className="text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  );
}

export function WorkflowHeader({ deck, filters, onFilterChange, onResetFilters, onRefresh }) {
  const hasFilter = Object.values(filters).some(v => v && v !== "all" && v !== "");

  return (
    <div className="space-y-4">
      {/* Page title row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={T.kicker}>Workflow Desk</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">Lead Pipeline Tracker</h1>
          <p className="mt-0.5 text-sm text-slate-400">Track movement across Sales → Legal → Finance → Completed</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onRefresh} className={T.btn}>
            <DashboardIcon name="analytics" className="h-4 w-4" />Refresh
          </button>
          <Link href="/leads" className={T.gold}>
            <DashboardIcon name="leads" className="h-4 w-4" />Open Leads
          </Link>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {deck.kpis.map((k, i) => (
          <StatChip
            key={k.label} label={k.label} value={k.value} hint={k.hint}
            accent={i === 2 ? "border-rose-200 bg-rose-100" : i === 3 ? "border-amber-200 bg-amber-100" : "border-slate-200 bg-slate-100"}
          />
        ))}
      </div>

      {/* Top signal cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {deck.topCards.map((c, i) => (
          <div key={c.label} className={`rounded-2xl border px-4 py-3 ${
            i === 0 ? "border-emerald-200 bg-emerald-100" :
            i === 1 ? "border-rose-200 bg-rose-100" :
            i === 2 ? "border-sky-200 bg-sky-100" :
            "border-amber-200 bg-amber-100"
          }`}>
            <p className={T.kicker}>{c.label}</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{c.value}</p>
            <p className="text-[11px] text-slate-400">{c.hint}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className={`${T.panel} px-4 py-4`}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <div className="relative sm:col-span-2">
            <DashboardIcon name="leads" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className={`${T.input} pl-10`} value={filters.query} onChange={e => onFilterChange("query", e.target.value)} placeholder="Search lead, owner, company…" />
          </div>
          <select className={T.input} value={filters.stage} onChange={e => onFilterChange("stage", e.target.value)}>
            <option value="all">All stages</option>
            {deck.stageOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select className={T.input} value={filters.status} onChange={e => onFilterChange("status", e.target.value)}>
            <option value="all">All status</option>
            {deck.statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select className={T.input} value={filters.owner} onChange={e => onFilterChange("owner", e.target.value)}>
            <option value="all">All owners</option>
            {deck.filterOptions.owners.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select className={T.input} value={filters.priority} onChange={e => onFilterChange("priority", e.target.value)}>
            <option value="all">All priority</option>
            {deck.filterOptions.priorities.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        {hasFilter ? (
          <button type="button" onClick={onResetFilters} className="mt-2.5 text-xs font-semibold text-amber-700 hover:text-amber-900">
            ✕ Clear filters
          </button>
        ) : null}
      </div>
    </div>
  );
}
