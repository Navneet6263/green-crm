"use client";

import Link from "next/link";
import { when, isToday, titleize, STATUS_TONE } from "./manager-utils";

function GlassPanel({ title, sub, count, countClass, children }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between border-b border-slate-100/80 px-5 py-4">
        <div>
          <p className="text-sm font-bold text-slate-800">{title}</p>
          <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${countClass}`}>{count}</span>
      </div>
      <div className="divide-y divide-slate-100/80 px-5">{children}</div>
    </div>
  );
}

function FollowUpRow({ item }) {
  const isOverdue = item.due_at && new Date(item.due_at).getTime() < Date.now();
  return (
    <div className="flex items-center gap-3 py-3">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isOverdue ? "bg-rose-400" : "bg-amber-400"}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-700">{item.company_name || "Untitled"}</p>
        <p className="truncate text-xs text-slate-400">{item.contact_person_name || "—"} · {item.owner_name || "Unassigned"}</p>
      </div>
      <span className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${isOverdue ? "bg-rose-50 text-rose-500" : "bg-amber-50 text-amber-600"}`}>
        {when(item.due_at, true)}
      </span>
    </div>
  );
}

function DemoRow({ lead }) {
  const tone = STATUS_TONE[lead.status] || "bg-slate-100 text-slate-500";
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
      <div className="min-w-0 flex-1">
        <Link href={`/leads/${lead.lead_id}`} prefetch={false}
          className="truncate text-sm font-medium text-slate-700 hover:text-violet-600">
          {lead.company_name || "Untitled lead"}
        </Link>
        <p className="truncate text-xs text-slate-400">{lead.contact_person || "—"} · {lead.assigned_to_name || "Unassigned"}</p>
      </div>
      <span className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${tone}`}>
        {titleize(lead.status || "new")}
      </span>
    </div>
  );
}

export default function ManagerTodayFocus({ reminders, leads }) {
  const todayFollowUps = reminders
    .filter((r) => isToday(r.due_at) || new Date(r.due_at) < new Date())
    .slice(0, 6);
  const demoLeads = leads
    .filter((l) => ["booked-demo", "demo-done", "trial-started"].includes(l.status))
    .slice(0, 5);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GlassPanel
        title="Today's Follow-ups"
        sub="Due today or overdue"
        count={`${todayFollowUps.length} pending`}
        countClass="bg-amber-50 text-amber-600"
      >
        {todayFollowUps.length
          ? todayFollowUps.map((r) => <FollowUpRow key={r.reminder_id} item={r} />)
          : <p className="py-6 text-center text-sm text-slate-400">All clear for today 🎉</p>}
      </GlassPanel>

      <GlassPanel
        title="Demo Pipeline"
        sub="Leads in demo or trial"
        count={`${demoLeads.length} active`}
        countClass="bg-violet-50 text-violet-600"
      >
        {demoLeads.length
          ? demoLeads.map((l) => <DemoRow key={l.lead_id} lead={l} />)
          : <p className="py-6 text-center text-sm text-slate-400">No demo leads right now.</p>}
      </GlassPanel>
    </div>
  );
}
