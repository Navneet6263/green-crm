"use client";

import Link from "next/link";
import { compact, when, titleize, initials, ROLE_TONE, KICKER, CARD } from "./manager-utils";

function TeamMemberCard({ user }) {
  const isActive = user.is_active !== false;
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white hover:shadow-sm">
      <div className="relative shrink-0">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-900 text-sm font-black text-white">
          {initials(user.displayName)}
        </span>
        <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${isActive ? "bg-green-500" : "bg-slate-300"}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-bold text-slate-900">{user.displayName}</p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ROLE_TONE[user.role] || "bg-slate-100 text-slate-600"}`}>
            {titleize(user.role || "user")}
          </span>
        </div>
        <p className="truncate text-xs text-slate-400">{user.email || "No email"}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Leads</p><p className="mt-1 font-black text-blue-600">{compact(user.ownedLeads)}</p></div>
          <div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tasks</p><p className="mt-1 font-black text-violet-600">{compact(user.ownedTasks)}</p></div>
          <div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">State</p><p className={`mt-1 font-black ${isActive ? "text-green-600" : "text-slate-400"}`}>{isActive ? "Active" : "Inactive"}</p></div>
        </div>
      </div>
    </div>
  );
}

export default function ManagerTeamSection({ ownerLoad, reminders, tasks }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
      <section className={CARD}>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className={KICKER}>Team Load</p>
            <h3 className="mt-1 text-xl font-black text-slate-900">Who needs manager attention</h3>
          </div>
          <Link href="/settings/teams" prefetch={false}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-600">
            Teams →
          </Link>
        </div>
        <div className="space-y-3">
          {ownerLoad.length ? ownerLoad.map((user) => (
            <TeamMemberCard key={user.user_id} user={user} />
          )) : (
            <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
              No team load data available.
            </div>
          )}
        </div>
      </section>

      <section className={CARD}>
        <div className="mb-5">
          <p className={KICKER}>Reminder Radar</p>
          <h3 className="mt-1 text-xl font-black text-slate-900">Follow-ups and task pressure</h3>
        </div>
        <div className="space-y-3">
          {reminders.length ? reminders.map((item) => (
            <div key={item.reminder_id}
              className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{item.company_name || "Untitled account"}</p>
                <p className="mt-0.5 truncate text-xs text-slate-400">
                  {item.contact_person_name || "No contact"} · {item.owner_name || "Unassigned"}
                </p>
              </div>
              <span className="shrink-0 rounded-xl bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-600 ring-1 ring-orange-200">
                {when(item.due_at, true)}
              </span>
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
              No reminders queued right now.
            </div>
          )}

          {tasks.slice(0, 4).length > 0 && (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {tasks.slice(0, 4).map((task) => (
                <div key={task.task_id}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-3 transition hover:border-violet-200 hover:shadow-sm">
                  <p className="text-xs font-bold text-slate-800 line-clamp-1">{task.title || "Untitled task"}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{titleize(task.status || "task")} · {when(task.due_date)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
