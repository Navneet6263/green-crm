"use client";

import Link from "next/link";
import { useMemo } from "react";
import WorkspacePage from "../../../components/dashboard/WorkspacePage";
import DashboardIcon from "../../../components/dashboard/icons";
import { StatCard, QuickLink, T, fmtCompact, fmtCurrency } from "./sales-tokens";
import { TodayLeads, TodayFollowUps } from "./SalesTodayPanels";
import { PipelineChart, RecentLeadsList } from "./SalesPipelinePanels";

function getCount(leadCounts, status) {
  return Number(leadCounts.find(i => i.status === status || (status === "closed-won" && i.status === "won"))?.total || 0);
}

function SalesDashboardView({ data, error, loading, session }) {
  const summary = data?.summary || {};
  const leads = data?.leads?.items || [];
  const tasks = data?.tasks?.items || [];
  const reminders = data?.reminders?.items || [];
  const leadCounts = summary.lead_counts || [];
  const totalLeads = leadCounts.reduce((s, i) => s + Number(i.total || 0), 0);
  const today = new Date().toDateString();
  const todayLeadCount = leads.filter(l => new Date(l.created_at).toDateString() === today).length;
  const todayFollowUpCount = reminders.filter(r => r.due_at && new Date(r.due_at).toDateString() === today).length
    + tasks.filter(t => t.due_date && new Date(t.due_date).toDateString() === today && t.status === "pending").length;
  const closedWon = getCount(leadCounts, "closed-won");
  const totalValue = leads.reduce((s, l) => s + Number(l.estimated_value || 0), 0);

  const STATS = [
    { label: "Total Leads",       value: fmtCompact(totalLeads),       hint: "In your scope",       accent: "border-slate-200 bg-slate-50" },
    { label: "Today's Leads",     value: fmtCompact(todayLeadCount),   hint: "Created today",       accent: "border-amber-200 bg-amber-50" },
    { label: "Today's Follow-ups",value: fmtCompact(todayFollowUpCount),hint: "Scheduled today",    accent: "border-sky-200 bg-sky-100" },
    { label: "Closed Won",        value: fmtCompact(closedWon),        hint: "Deals closed",        accent: "border-emerald-200 bg-emerald-100" },
    { label: "Pipeline Value",    value: fmtCurrency(totalValue),      hint: "Visible pipeline",    accent: "border-violet-200 bg-violet-100" },
  ];

  return (
    <div className="space-y-5">
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}

      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center text-sm text-slate-400">Loading sales workspace…</div>
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={T.K}>Sales Workspace</p>
              <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
                Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {session?.user?.name?.split(" ")[0] || "there"} 👋
              </h1>
              <p className="mt-0.5 text-sm text-slate-400">Here's your sales pulse for today.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <QuickLink href="/leads/new" icon="leads" label="New Lead" />
              <QuickLink href="/leads" icon="workflow" label="Pipeline" />
              <QuickLink href="/tasks" icon="tasks" label="Tasks" />
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {STATS.map(s => <StatCard key={s.label} {...s} />)}
          </div>

          {/* Main grid — Today panels + Pipeline */}
          <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            <TodayLeads leads={leads} />
            <TodayFollowUps reminders={reminders} tasks={tasks} />
          </div>

          {/* Bottom row — Chart + Recent leads */}
          <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
            <PipelineChart leadCounts={leadCounts} />
            <RecentLeadsList leads={leads} />
          </div>
        </>
      )}
    </div>
  );
}

export default function SalesDashboard() {
  return (
    <WorkspacePage
      title="Sales Dashboard"
      eyebrow="Sales Workspace"
      allowedRoles={["sales"]}
      hideTitle
      requestBuilder={() => [
        { key: "summary", path: "/dashboard/summary" },
        { key: "leads", path: "/leads?page_size=12" },
        { key: "tasks", path: "/tasks?page_size=10" },
        { key: "reminders", path: "/leads/reminders?page_size=10" },
      ]}
    >
      {({ data, error, loading, session }) => (
        <SalesDashboardView data={data} error={error} loading={loading} session={session} />
      )}
    </WorkspacePage>
  );
}
