"use client";

import { useMemo } from "react";
import Link from "next/link";
import LeadQuickStatusControl from "../../../components/leads/LeadQuickStatusControl";
import { titleize, when } from "./manager-utils";
import { AvatarInitials, ChartCard, StatusBadge } from "./ManagerDashboardPrimitives";

function RecentLeadRow({ lead, index }) {
  return (
    <tr className="border-t border-slate-100 hover:bg-slate-50/50">
      <td className="py-3 pr-2">
        <div className="flex min-w-0 items-center gap-3">
          <AvatarInitials name={lead.company_name} colorIndex={index} />
          <Link href={`/leads/${lead.lead_id}`} prefetch={false} className="min-w-0 truncate text-sm font-semibold text-slate-900 hover:text-amber-600">
            {lead.company_name || "Unnamed"}
          </Link>
        </div>
      </td>
      <td className="hidden px-2 py-3 text-sm text-slate-600 md:table-cell">{lead.contact_person || "--"}</td>
      <td className="hidden px-2 py-3 text-sm text-slate-600 lg:table-cell">{titleize(lead.lead_source || "Unknown")}</td>
      <td className="px-2 py-3"><StatusBadge status={lead.status} /></td>
      <td className="py-3 pl-2 text-right text-sm text-slate-400">{when(lead.created_at, true)}</td>
    </tr>
  );
}

function RecentLeadCompact({ lead, index, session, refresh }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0">
      <AvatarInitials name={lead.company_name} colorIndex={index} />
      <div className="min-w-0 flex-1">
        <Link href={`/leads/${lead.lead_id}`} prefetch={false} className="block truncate text-sm font-semibold text-slate-900 hover:text-amber-600">
          {lead.company_name || "Unnamed"}
        </Link>
        <p className="mt-0.5 text-xs text-slate-400">{when(lead.created_at, true)}</p>
      </div>
      <LeadQuickStatusControl
        lead={lead}
        token={session?.token}
        onUpdated={() => refresh?.()}
        hideLabel
        selectClassName="min-h-[32px] max-w-[120px] rounded-xl border-slate-200 bg-slate-50 px-2 text-[11px] text-slate-600"
        notePanelClassName="absolute right-0 top-full mt-2 w-[min(78vw,320px)]"
      />
    </div>
  );
}

function TodayDemo({ leads = [] }) {
  const todayDemos = useMemo(() => {
    const today = new Date().toDateString();
    return leads.filter((l) => {
      const s = String(l.status || "").toLowerCase();
      if (s !== "demo" && s !== "demo-scheduled") return false;
      if (!l.followup_date && !l.demo_date) return false;
      const d = new Date(l.demo_date || l.followup_date);
      return d.toDateString() === today;
    });
  }, [leads]);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.06)]">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-slate-900">Today&apos;s Demos</h2>
        <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-600">{todayDemos.length}</span>
      </div>
      {todayDemos.length ? todayDemos.map((lead, i) => (
        <div key={lead.lead_id} className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0">
          <AvatarInitials name={lead.company_name} colorIndex={i} />
          <div className="min-w-0 flex-1">
            <Link href={`/leads/${lead.lead_id}`} prefetch={false} className="block truncate text-sm font-semibold text-slate-900 hover:text-amber-600">
              {lead.company_name || "Unnamed"}
            </Link>
            <p className="mt-0.5 text-xs text-slate-400">{lead.contact_person || "--"}</p>
          </div>
          <StatusBadge status={lead.status} />
        </div>
      )) : (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 px-4 py-8 text-center">
          <svg viewBox="0 0 24 24" className="mb-2 h-8 w-8 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="3" />
            <path d="M16 2v4M8 2v4M3 10h18" />
            <path d="m9 16 2 2 4-4" />
          </svg>
          <p className="text-sm font-medium text-slate-400">No demos scheduled for today</p>
        </div>
      )}
    </div>
  );
}

export default function ManagerRecentLeads({ leads = [], refresh, session }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      {/* Main table */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.06)]">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-900">Recent Leads</h2>
          <Link href="/leads" prefetch={false} className="text-sm font-semibold text-[#7C3AED] hover:text-amber-600">
            View all leads →
          </Link>
        </div>
        {leads.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[580px] table-fixed text-left">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400">
                  <th className="w-[32%] pb-3 pr-2 text-left font-semibold">Company</th>
                  <th className="hidden w-[20%] px-2 pb-3 text-left font-semibold md:table-cell">Contact</th>
                  <th className="hidden w-[16%] px-2 pb-3 text-left font-semibold lg:table-cell">Source</th>
                  <th className="w-[18%] px-2 pb-3 text-left font-semibold">Stage</th>
                  <th className="w-[14%] pb-3 pl-2 text-right font-semibold">Time</th>
                </tr>
              </thead>
              <tbody>
                {leads.slice(0, 5).map((lead, index) => (
                  <RecentLeadRow key={lead.lead_id} lead={lead} index={index} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">No recent leads yet.</p>
        )}
      </div>

      {/* Today's Demo */}
      <TodayDemo leads={leads} />
    </div>
  );
}
