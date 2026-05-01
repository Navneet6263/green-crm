"use client";

import { compact, money } from "./manager-utils";
import { ChartCard } from "./ManagerDashboardPrimitives";

function MetricLine({ label, value, tone = "text-slate-900" }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="font-medium text-slate-600">{label}</span>
      <span className={`font-bold ${tone}`}>{value}</span>
    </div>
  );
}

function Bar({ color, value }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, background: color }} />
    </div>
  );
}

function PipelineOverview({ convRate, lostLeads, lostRate, pendingFollowups, totalLeads, wonLeads }) {
  const followupPct = totalLeads ? Math.min(100, Math.round((pendingFollowups / totalLeads) * 100)) : 0;
  return (
    <ChartCard>
      <h2 className="mb-4 text-lg font-bold text-slate-900">Pipeline Overview</h2>
      <div className="space-y-3">
        <MetricLine label="Won Rate" value={`${convRate}%`} tone="text-emerald-500" />
        <Bar color="#22C55E" value={convRate} />
        <MetricLine label="Closed Won" value={compact(wonLeads)} />
        <div className="border-t border-slate-100 pt-3">
          <MetricLine label="Lost Rate" value={`${lostRate}%`} tone="text-red-500" />
        </div>
        <Bar color="#EF4444" value={lostRate} />
        <MetricLine label="Closed Lost" value={compact(lostLeads)} />
        <div className="border-t border-slate-100 pt-3">
          <MetricLine label="Follow-up Pressure" value={compact(pendingFollowups)} tone="text-[#F59E0B]" />
        </div>
        <Bar color="#F59E0B" value={followupPct} />
      </div>
    </ChartCard>
  );
}

function ValueCard({ totalLeads, totalValue }) {
  return (
    <ChartCard>
      <p className="text-base font-medium text-slate-900">Total Pipeline Value</p>
      <div className="mt-4 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#FEF3C7] text-lg font-black text-[#92400E]">INR</span>
            <strong className="text-3xl font-extrabold leading-none text-slate-950">{money(totalValue)}</strong>
          </div>
          <p className="mt-3 text-sm font-semibold text-emerald-600">+ {compact(totalLeads)} total leads</p>
        </div>
        <div className="relative h-20 w-20 shrink-0">
          <div className="absolute bottom-0 right-0 h-16 w-16 rounded-full bg-[#FEF3C7]" />
          <div className="absolute bottom-2 left-1 h-5 w-8 rounded-full border border-[#FCD34D] bg-[#FEF3C7]" />
        </div>
      </div>
    </ChartCard>
  );
}

function OverdueCard({ overdueTasks }) {
  return (
    <ChartCard>
      <p className="text-base font-medium text-slate-900">Overdue Tasks</p>
      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-500">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="16" rx="3" />
              <path d="M8 3v4M16 3v4M3 10h18m6 5 2 2 4-4" />
            </svg>
          </span>
          <div>
            <strong className="text-3xl font-extrabold leading-none text-slate-950">{compact(overdueTasks)}</strong>
            {overdueTasks > 0 ? <p className="text-xs font-semibold text-rose-500">{overdueTasks} need attention</p> : null}
          </div>
        </div>
        <div className="relative h-20 w-20 shrink-0">
          <div className="absolute inset-0 rounded-full bg-rose-100" />
          <div className="absolute left-3 top-4 h-11 w-11 rounded-full border-4 border-rose-200 bg-rose-50" />
        </div>
      </div>
    </ChartCard>
  );
}

export default function ManagerPipelineCards(props) {
  return (
    <div className="space-y-4">
      <PipelineOverview {...props} />
      <ValueCard {...props} />
      <OverdueCard overdueTasks={props.overdueTasks} />
    </div>
  );
}
