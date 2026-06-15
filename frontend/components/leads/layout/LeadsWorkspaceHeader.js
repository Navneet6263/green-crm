"use client";

import Link from "next/link";
import DashboardIcon from "../../dashboard/icons";
import LeadFiltersSection from "../filters/LeadFiltersSection";
import { LEAD_GHOST_BUTTON_CLASS, LEAD_KICKER_CLASS, LEAD_PRIMARY_BUTTON_CLASS } from "../shared/leadPageConstants";

const STAT_ACCENT = [
  "border-slate-200 bg-slate-50",
  "border-amber-200 bg-amber-50",
  "border-sky-200 bg-sky-100",
  "border-emerald-200 bg-emerald-100",
];

export default function LeadsWorkspaceHeader({
  canCreate, filtersProps, heroStats, isPlatformConsole, isSuper,
  ownershipLabel, setShowBulkUpload, showBulkUpload,
}) {
  return (
    <div className="space-y-4">
      {/* Title row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className={LEAD_KICKER_CLASS}>Lead Workspace</p>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
              {ownershipLabel}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
              {isPlatformConsole ? `Platform · ${isSuper ? "All Tenants" : "Assigned"}` : "Sales Workspace"}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Lead Pipeline</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreate ? (
            <Link prefetch={false} href="/leads/new" className={LEAD_PRIMARY_BUTTON_CLASS}>
              <DashboardIcon name="leads" className="h-4 w-4" />
              Create Lead
            </Link>
          ) : null}
          {canCreate ? (
            <button className={LEAD_GHOST_BUTTON_CLASS} type="button" onClick={() => setShowBulkUpload(c => !c)}>
              <DashboardIcon name="analytics" className="h-4 w-4" />
              {showBulkUpload ? "Hide Bulk Upload" : "Bulk Upload"}
            </button>
          ) : null}
          <Link prefetch={false} href="/leads/history" className={LEAD_GHOST_BUTTON_CLASS}>
            <DashboardIcon name="analytics" className="h-4 w-4" />
            History
          </Link>
        </div>
      </div>

      {/* Hero stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {heroStats.map((item, i) => {
          const Tag = item.onClick ? "button" : "div";
          return (
            <Tag
              key={item.label}
              type={item.onClick ? "button" : undefined}
              onClick={item.onClick}
              className={`group relative overflow-hidden rounded-2xl border px-4 py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${item.onClick ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 text-left" : ""} ${STAT_ACCENT[i] || "border-slate-200 bg-slate-50"}`}
            >
              {/* shimmer sweep on hover */}
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
              <p className={LEAD_KICKER_CLASS}>{item.label}</p>
              <p className="mt-1.5 text-xl font-bold leading-none text-slate-900" style={{ color: item.color || undefined }}>
                {item.value}
              </p>
            </Tag>
          );
        })}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
        <LeadFiltersSection {...filtersProps} />
      </div>
    </div>
  );
}
