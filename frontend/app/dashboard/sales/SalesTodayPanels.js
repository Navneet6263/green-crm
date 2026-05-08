"use client";

import Link from "next/link";
import { T, fmtDate, fmtCurrency, titleize, initials } from "./sales-tokens";

const STATUS_DOT = {
  new: "bg-sky-400", contacted: "bg-cyan-400", qualified: "bg-violet-400",
  proposal: "bg-amber-400", negotiation: "bg-orange-400", "booked-demo": "bg-violet-400",
  "demo-done": "bg-emerald-400", "trial-started": "bg-blue-400", "closed-won": "bg-emerald-500",
};

export function TodayLeads({ leads }) {
  const today = new Date().toDateString();
  const todayLeads = leads.filter(l => new Date(l.created_at).toDateString() === today);

  return (
    <div className={`${T.panel} px-5 py-5`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className={T.K}>Today's Leads</p>
          <h3 className="mt-0.5 text-base font-bold text-slate-900">{todayLeads.length} new today</h3>
        </div>
        <Link href="/leads" prefetch={false} className="text-xs font-semibold text-amber-700 hover:text-amber-900">View all →</Link>
      </div>

      {todayLeads.length ? (
        <div className="space-y-2">
          {todayLeads.slice(0, 5).map(lead => (
            <Link key={lead.lead_id} href={`/leads/${lead.lead_id}`} prefetch={false}
              className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-3.5 py-3 transition hover:border-amber-200 hover:bg-amber-50/30">
              <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[lead.status] || "bg-slate-300"}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{lead.company_name || lead.contact_person || "New lead"}</p>
                <p className="truncate text-xs text-slate-400">{lead.contact_person || "—"} · {titleize(lead.lead_source || "website")}</p>
              </div>
              <span className="shrink-0 text-xs font-bold text-slate-600">{fmtCurrency(lead.estimated_value)}</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">No leads created today yet.</p>
      )}
    </div>
  );
}

export function TodayFollowUps({ reminders, tasks }) {
  const today = new Date().toDateString();
  const todayReminders = reminders.filter(r => r.due_at && new Date(r.due_at).toDateString() === today);
  const todayTasks = tasks.filter(t => t.due_date && new Date(t.due_date).toDateString() === today && t.status === "pending");
  const combined = [
    ...todayReminders.map(r => ({ key: r.reminder_id, title: r.company_name || "Follow-up", sub: r.contact_person_name || "Lead", time: fmtDate(r.due_at, true), href: `/leads/${r.lead_id}`, type: "lead" })),
    ...todayTasks.map(t => ({ key: t.task_id, title: t.title || "Task", sub: titleize(t.type || "task"), time: fmtDate(t.due_date, true), href: t.related_id ? `/leads/${t.related_id}` : "/tasks", type: "task" })),
  ].slice(0, 6);

  return (
    <div className={`${T.panel} px-5 py-5`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className={T.K}>Today's Follow-ups</p>
          <h3 className="mt-0.5 text-base font-bold text-slate-900">{combined.length} scheduled</h3>
        </div>
        <Link href="/tasks" prefetch={false} className="text-xs font-semibold text-amber-700 hover:text-amber-900">Tasks →</Link>
      </div>

      {combined.length ? (
        <div className="space-y-2">
          {combined.map(item => (
            <Link key={item.key} href={item.href} prefetch={false}
              className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-3.5 py-3 transition hover:border-amber-200 hover:bg-amber-50/30">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold text-white ${item.type === "lead" ? "bg-amber-500" : "bg-sky-500"}`}>
                {item.type === "lead" ? "📞" : "✅"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="truncate text-xs text-slate-400">{item.sub}</p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-amber-700">{item.time}</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">No follow-ups scheduled for today.</p>
      )}
    </div>
  );
}
