"use client";

import Link from "next/link";

import DashboardIcon from "../../dashboard/icons";
import LeadFiltersSection from "../filters/LeadFiltersSection";
import {
  LEAD_GHOST_BUTTON_CLASS,
  LEAD_KICKER_CLASS,
  LEAD_PRIMARY_BUTTON_CLASS,
} from "../shared/leadPageConstants";

export default function LeadsWorkspaceHeader({
  canCreate,
  filtersProps,
  heroStats,
  isPlatformConsole,
  isSuper,
  ownershipLabel,
  setShowBulkUpload,
  showBulkUpload,
}) {
  return (
    <article className="rounded-[34px] border border-[#eadfcd] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.94),_rgba(247,240,227,0.96)_42%,_rgba(241,232,215,1)_100%)] p-5 shadow-[0_22px_60px_rgba(79,58,22,0.08)] md:p-7">
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr] xl:items-stretch">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
              Lead Workspace
            </span>
            <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
              {ownershipLabel}
            </span>
            <span className="inline-flex rounded-full border border-[#eadfcd] bg-[#fff6e4] px-3 py-1 text-[11px] font-bold text-[#7a6230]">
              {isPlatformConsole ? `Platform · ${isSuper ? "All Tenants" : "Assigned Companies"}` : "Sales Workspace"}
            </span>
          </div>

          <div>
            <p className={LEAD_KICKER_CLASS}>Pipeline Snapshot</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#060710]">Leads workspace</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {heroStats.map((item, index) => (
              <article
                key={item.label}
                className={`rounded-[24px] border border-[#eadfcd] p-4 shadow-[0_12px_28px_rgba(79,58,22,0.05)] ${index === 0 ? "bg-[#fff6e4]" : "bg-white/82"}`}
              >
                <p className={LEAD_KICKER_CLASS}>{item.label}</p>
                <p className="mt-4 text-2xl font-semibold tracking-tight" style={{ color: item.color || "#060710" }}>
                  {item.value}
                </p>
              </article>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            {canCreate ? (
              <Link prefetch={false} href="/leads/new" className={LEAD_PRIMARY_BUTTON_CLASS}>
                <DashboardIcon name="leads" className="h-4 w-4" />
                Create Lead
              </Link>
            ) : null}
            {canCreate ? (
              <button className={LEAD_GHOST_BUTTON_CLASS} type="button" onClick={() => setShowBulkUpload((current) => !current)}>
                <DashboardIcon name="analytics" className="h-4 w-4" />
                {showBulkUpload ? "Hide Bulk Upload" : "Bulk Upload"}
              </button>
            ) : null}
            <Link prefetch={false} href="/leads/history" className={LEAD_GHOST_BUTTON_CLASS}>
              <DashboardIcon name="analytics" className="h-4 w-4" />
              Lead History
            </Link>
          </div>
        </div>

        <div className="min-w-0">
          <LeadFiltersSection {...filtersProps} />
        </div>
      </div>
    </article>
  );
}
