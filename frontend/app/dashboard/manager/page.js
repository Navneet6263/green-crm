"use client";

import Link from "next/link";

import WorkspacePage from "../../../components/dashboard/WorkspacePage";
import DashboardIcon from "../../../components/dashboard/icons";
import LeadQuickStatusControl from "../../../components/leads/LeadQuickStatusControl";

const PANEL = "rounded-[30px] border border-[#eadfcd] bg-white/84 p-5 shadow-[0_14px_36px_rgba(79,58,22,0.06)] md:p-6";
const SOFT = "rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4";
const KICKER = "text-[10px] font-black uppercase tracking-[0.28em] text-[#9a886d]";

const STATUS_ORDER = ["new", "contacted", "qualified", "proposal", "negotiation", "closed-won"];
const STATUS_TONE = {
  new: "bg-[#eef5ff] text-[#2563eb] ring-[#cfe0ff]",
  contacted: "bg-[#ecfbff] text-[#0f8da8] ring-[#c8eef4]",
  qualified: "bg-[#f5efff] text-[#7c3aed] ring-[#e4d8ff]",
  proposal: "bg-[#fff4d9] text-[#8d6e27] ring-[#ecdcae]",
  negotiation: "bg-[#fff0e2] text-[#c56b1c] ring-[#f0d3bc]",
  won: "bg-[#ebf8ee] text-[#217346] ring-[#ccead5]",
  "closed-won": "bg-[#ebf8ee] text-[#217346] ring-[#ccead5]",
};

const ROLE_TONE = {
  manager: "bg-[#f6efe2] text-[#5d503c]",
  sales: "bg-[#ebf8ee] text-[#217346]",
  marketing: "bg-[#fff2e8] text-[#b4681f]",
  support: "bg-[#eef5ff] text-[#2563eb]",
  "legal-team": "bg-[#fff0e2] text-[#c56b1c]",
  "finance-team": "bg-[#fff4d9] text-[#8d6e27]",
};

function compact(value) {
  const num = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    notation: num >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(num);
}

function money(value) {
  return `INR ${Number(value || 0).toLocaleString("en-IN")}`;
}

function when(value, withTime = false) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function titleize(value = "") {
  return String(value)
    .replaceAll("_", "-")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function initials(value = "?") {
  return (
    String(value)
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "?"
  );
}

function countByStatus(leadCounts, status) {
  return Number(
    leadCounts.find((item) => item.status === status || (status === "closed-won" && item.status === "won"))?.total || 0
  );
}

function StageMomentum({ leadCounts }) {
  const points = STATUS_ORDER.map((status) => ({
    key: status,
    label: titleize(status),
    value: countByStatus(leadCounts, status),
  }));
  const max = Math.max(...points.map((item) => item.value), 1);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        {points.slice(0, 3).map((item) => (
          <div key={item.key} className={SOFT}>
            <span className={KICKER}>{item.label}</span>
            <strong className="mt-3 block text-2xl font-black text-[#060710]">{compact(item.value)}</strong>
          </div>
        ))}
      </div>
      <div className="rounded-[28px] border border-[#eadfcd] bg-white/78 p-4">
        <div className="space-y-4">
          {points.map((item) => (
            <div key={item.key} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-[#5d503c]">{item.label}</span>
                <span className="font-black text-[#060710]">{compact(item.value)}</span>
              </div>
              <div className="h-3 rounded-full bg-[#f5ecdc]">
                <div
                  className="h-3 rounded-full bg-[linear-gradient(90deg,#cba952_0%,#e9d089_100%)]"
                  style={{ width: `${Math.max(8, Math.round((item.value / max) * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActionLink({ href, icon, title, copy, tone }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-[24px] border border-[#eadfcd] bg-white/88 px-4 py-4 transition hover:-translate-y-0.5 hover:border-[#d7b258] hover:bg-[#fffaf1] hover:shadow-[0_14px_30px_rgba(79,58,22,0.08)]"
    >
      <span className={`grid h-11 w-11 place-items-center rounded-2xl ${tone}`}>
        <DashboardIcon name={icon} className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#060710]">{title}</p>
        <p className="truncate text-xs text-[#8f816a]">{copy}</p>
      </div>
    </Link>
  );
}

export default function ManagerDashboard() {
  return (
    <WorkspacePage
      title="Manager Dashboard"
      eyebrow="Team Workspace"
      hideTitle
      allowedRoles={["manager"]}
      requestBuilder={() => [
        { key: "summary", path: "/dashboard/summary" },
        { key: "leads", path: "/leads?page_size=6" },
        { key: "users", path: "/users?page_size=8" },
        { key: "tasks", path: "/tasks?page_size=6" },
        { key: "reminders", path: "/leads/reminders?page_size=6" },
      ]}
      heroStats={() => []}
    >
      {({ data, error, loading, session, refresh }) => {
        const summary = data?.summary || {};
        const leads = data?.leads?.items || [];
        const users = data?.users?.items || [];
        const tasks = data?.tasks?.items || [];
        const reminders = data?.reminders?.items || [];
        const leadCounts = summary.lead_counts || [];
        const sourceMix = summary.source_mix || [];
        const products = summary.recent_products || [];

        const totalLeads = leadCounts.reduce((sum, item) => sum + Number(item.total || 0), 0);
        const openPipeline = leadCounts
          .filter((item) => ["contacted", "qualified", "proposal", "negotiation"].includes(item.status))
          .reduce((sum, item) => sum + Number(item.total || 0), 0);
        const wonLeads = countByStatus(leadCounts, "closed-won");
        const activeUsers = users.filter((item) => item.is_active !== false).length;
        const overdueTasks = tasks.filter((task) => {
          if (!task?.due_date) return false;
          const due = new Date(task.due_date);
          return !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
        }).length;
        const coachingLeads = [...leads]
          .sort((a, b) => Number(b.estimated_value || 0) - Number(a.estimated_value || 0))
          .slice(0, 3);
        const ownerLoad = users
          .map((user) => {
            const name = user.name || user.full_name || "Unknown";
            const ownedLeads = leads.filter((lead) => lead.assigned_to_name === name).length;
            const ownedTasks = tasks.filter((task) => task.assigned_to_name === name || task.owner_name === name).length;
            return { ...user, displayName: name, ownedLeads, ownedTasks };
          })
          .sort((a, b) => b.ownedLeads - a.ownedLeads || b.ownedTasks - a.ownedTasks)
          .slice(0, 5);
        const focusSources = [...sourceMix].sort((a, b) => Number(b.total || 0) - Number(a.total || 0)).slice(0, 4);

        return (
          <>
            {error ? <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}
            {loading ? (
              <div className="flex items-center gap-3 py-10 text-sm text-[#8f816a]">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#cba952] border-t-transparent" />
                Loading manager cockpit...
              </div>
            ) : null}

            {!loading ? (
              <div className="flex flex-col gap-5">
                <section className="overflow-hidden rounded-[36px] border border-[#eadfcd] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(250,241,221,0.98)_44%,_rgba(245,231,193,0.98)_100%)] shadow-[0_24px_70px_rgba(79,58,22,0.08)]">
                  <div className="space-y-5 px-5 py-6 md:px-7 md:py-7">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {[
                        { label: "Visible Leads", value: totalLeads, hint: "Current team-facing pipeline", color: "#060710" },
                        { label: "Open Pipeline", value: openPipeline, hint: "Qualified and active deals", color: "#8d6e27" },
                        { label: "Closed Won", value: wonLeads, hint: "Won inside current scope", color: "#217346" },
                        { label: "Pending Follow-ups", value: summary.pending_reminders || reminders.length, hint: "Needs manager push", color: "#c56b1c" },
                      ].map((card) => (
                        <article key={card.label} className="rounded-[24px] border border-[#eadfcd] bg-white/84 px-4 py-4 shadow-[0_10px_24px_rgba(79,58,22,0.06)]">
                          <span className={KICKER}>{card.label}</span>
                          <strong className="mt-3 block text-[2rem] font-black leading-none" style={{ color: card.color }}>{compact(card.value)}</strong>
                          <p className="mt-2 text-xs text-[#8f816a]">{card.hint}</p>
                        </article>
                      ))}
                    </div>

                    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                      <div className="rounded-[30px] border border-[#eadfcd] bg-white/84 p-5 shadow-[0_14px_36px_rgba(79,58,22,0.06)]">
                        <div className="mb-5">
                          <p className={KICKER}>Manager Focus</p>
                          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Move the day with clearer calls.</h3>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <ActionLink href="/leads" icon="leads" title="Lead Workspace" copy="Review queue, ownership, and stage movement." tone="bg-[#fff4d9] text-[#8d6e27]" />
                          <ActionLink href="/tasks" icon="tasks" title="Task Board" copy="Check overdue execution before it slips further." tone="bg-[#fff0e2] text-[#c56b1c]" />
                          <ActionLink href="/analytics" icon="analytics" title="Analytics" copy="Read source mix, stage performance, and depth." tone="bg-[#f6efe2] text-[#5d503c]" />
                          <ActionLink href="/performance" icon="performance" title="Performance" copy="Compare load, wins, and team output." tone="bg-[#ebf8ee] text-[#217346]" />
                        </div>
                      </div>

                      <div className="rounded-[30px] border border-[#eadfcd] bg-white/84 p-5 shadow-[0_14px_36px_rgba(79,58,22,0.06)]">
                        <div className="mb-5">
                          <p className={KICKER}>Quick Read</p>
                          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Small signals worth noticing</h3>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                          <div className={SOFT}><span className={KICKER}>Active Team</span><strong className="mt-3 block text-2xl font-black text-[#060710]">{compact(activeUsers || summary.team_size || 0)}</strong></div>
                          <div className={SOFT}><span className={KICKER}>Overdue Tasks</span><strong className="mt-3 block text-2xl font-black text-[#c56b1c]">{compact(overdueTasks)}</strong></div>
                          <div className={SOFT}><span className={KICKER}>Products Live</span><strong className="mt-3 block text-2xl font-black text-[#8d6e27]">{compact(products.length)}</strong></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                  <section className={PANEL}>
                    <div className="mb-5 flex items-start justify-between gap-3">
                      <div>
                        <p className={KICKER}>Stage Momentum</p>
                        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Pipeline pressure by status</h3>
                      </div>
                      <Link href="/workflow" className="inline-flex rounded-[16px] border border-[#eadfcd] bg-white px-3 py-2 text-xs font-semibold text-[#5d503c] transition hover:border-[#d7b258] hover:text-[#060710]">
                        Open Workflow
                      </Link>
                    </div>
                    <StageMomentum leadCounts={leadCounts} />
                  </section>

                  <section className={PANEL}>
                    <div className="mb-5">
                      <p className={KICKER}>Coaching Board</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">High-value leads to watch</h3>
                    </div>
                    <div className="space-y-3">
                      {coachingLeads.length ? coachingLeads.map((lead) => (
                        <article key={lead.lead_id} className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4 transition hover:-translate-y-0.5 hover:border-[#d7b258] hover:bg-white">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <Link href={`/leads/${lead.lead_id}`} className="truncate text-sm font-semibold text-[#060710] hover:text-[#8d6e27]">
                                {lead.company_name || "Untitled lead"}
                              </Link>
                              <p className="mt-1 truncate text-xs text-[#8f816a]">{lead.contact_person || "No contact"} | {lead.assigned_to_name || "Unassigned"}</p>
                            </div>
                            <div className="space-y-2 text-right">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${STATUS_TONE[lead.status] || "bg-[#f6efe2] text-[#5d503c] ring-[#eadfcd]"}`}>{titleize(lead.status || "new")}</span>
                              <LeadQuickStatusControl lead={lead} token={session?.token} onUpdated={() => refresh?.()} />
                            </div>
                          </div>
                          <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
                            <div><p className={KICKER}>Value</p><p className="mt-2 font-semibold text-[#060710]">{money(lead.estimated_value)}</p></div>
                            <div><p className={KICKER}>Source</p><p className="mt-2 font-semibold text-[#060710]">{titleize(lead.lead_source || "unknown")}</p></div>
                            <div className="space-y-2"><p className={KICKER}>Follow-up</p><p className="mt-2 font-semibold text-[#060710]">{when(lead.follow_up_date, true)}</p><Link href={`/leads/${lead.lead_id}`} className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-semibold text-[#5d503c] hover:border-[#d7b258] hover:text-[#060710]">Open</Link></div>
                          </div>
                        </article>
                      )) : <div className="rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-12 text-center text-sm text-[#7a6b57]">No coaching leads visible yet.</div>}
                    </div>
                  </section>
                </div>

                <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
                  <section className={PANEL}>
                    <div className="mb-5 flex items-start justify-between gap-3">
                      <div>
                        <p className={KICKER}>Team Load</p>
                        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Who needs manager attention</h3>
                      </div>
                      <Link href="/settings/users" className="inline-flex rounded-[16px] border border-[#eadfcd] bg-white px-3 py-2 text-xs font-semibold text-[#5d503c] transition hover:border-[#d7b258] hover:text-[#060710]">
                        Open Team
                      </Link>
                    </div>
                    <div className="space-y-3">
                      {ownerLoad.length ? ownerLoad.map((user) => (
                        <div key={user.user_id} className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                          <div className="flex items-start gap-3">
                            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#10111d] text-sm font-bold text-white">
                              {initials(user.displayName)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-[#060710]">{user.displayName}</p>
                                  <p className="truncate text-xs text-[#8f816a]">{user.email || "No email on file"}</p>
                                </div>
                                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${ROLE_TONE[user.role] || "bg-[#f6efe2] text-[#5d503c]"}`}>{titleize(user.role || "user")}</span>
                              </div>
                              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                <div><p className={KICKER}>Owned Leads</p><p className="mt-2 font-black text-[#060710]">{compact(user.ownedLeads)}</p></div>
                                <div><p className={KICKER}>Owned Tasks</p><p className="mt-2 font-black text-[#060710]">{compact(user.ownedTasks)}</p></div>
                                <div><p className={KICKER}>State</p><p className={`mt-2 font-black ${user.is_active === false ? "text-[#c56b1c]" : "text-[#217346]"}`}>{user.is_active === false ? "Inactive" : "Active"}</p></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )) : <div className="rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-12 text-center text-sm text-[#7a6b57]">No team load data available.</div>}
                    </div>
                  </section>

                  <section className={PANEL}>
                    <div className="mb-5">
                      <p className={KICKER}>Reminder Radar</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Follow-ups and task pressure</h3>
                    </div>
                    <div className="grid gap-3">
                      {reminders.length ? reminders.map((item) => (
                        <div key={item.reminder_id} className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#060710]">{item.company_name || "Untitled account"}</p>
                              <p className="mt-1 truncate text-xs text-[#8f816a]">{item.contact_person_name || "No contact"} | {item.owner_name || "Unassigned"}</p>
                            </div>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#8d6e27] ring-1 ring-[#eadfcd]">{when(item.due_at, true)}</span>
                          </div>
                        </div>
                      )) : <div className="rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-12 text-center text-sm text-[#7a6b57]">No reminders queued right now.</div>}
                      <div className="grid gap-3 md:grid-cols-2">
                        {tasks.slice(0, 4).map((task) => (
                          <div key={task.task_id} className="rounded-[24px] border border-[#eadfcd] bg-white/78 px-4 py-4">
                            <p className="text-sm font-semibold text-[#060710]">{task.title || "Untitled task"}</p>
                            <p className="mt-2 text-xs text-[#8f816a]">{titleize(task.status || task.type || "task")} | {when(task.due_date, true)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                </div>

                <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                  <section className={PANEL}>
                    <div className="mb-5 flex items-start justify-between gap-3">
                      <div>
                        <p className={KICKER}>Lead Queue</p>
                        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Recent team leads</h3>
                      </div>
                      <Link href="/leads" className="inline-flex rounded-[16px] border border-[#eadfcd] bg-white px-3 py-2 text-xs font-semibold text-[#5d503c] transition hover:border-[#d7b258] hover:text-[#060710]">
                        View all
                      </Link>
                    </div>
                    <div className="grid gap-3">
                      {leads.length ? leads.map((lead) => (
                        <article key={lead.lead_id} className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4 transition hover:-translate-y-0.5 hover:border-[#d7b258] hover:bg-white">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#10111d] text-sm font-bold text-white">{initials(lead.company_name)}</span>
                              <div className="min-w-0">
                                <Link href={`/leads/${lead.lead_id}`} className="truncate text-sm font-semibold text-[#060710] hover:text-[#8d6e27]">
                                  {lead.company_name || "Unnamed lead"}
                                </Link>
                                <p className="truncate text-xs text-[#8f816a]">{lead.contact_person || lead.contact_person_name || "No contact on file"}</p>
                              </div>
                            </div>
                            <div className="space-y-2 text-right">
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${STATUS_TONE[lead.status] || "bg-[#f6efe2] text-[#5d503c] ring-[#eadfcd]"}`}>{titleize(lead.status || "new")}</span>
                              <LeadQuickStatusControl lead={lead} token={session?.token} onUpdated={() => refresh?.()} />
                            </div>
                          </div>
                          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                            <div><p className={KICKER}>Value</p><p className="mt-2 font-semibold text-[#060710]">{money(lead.estimated_value)}</p></div>
                            <div><p className={KICKER}>Workflow</p><p className="mt-2 font-semibold text-[#060710]">{titleize(lead.workflow_stage || "sales")}</p></div>
                            <div className="space-y-2"><p className={KICKER}>Added</p><p className="mt-2 font-semibold text-[#060710]">{when(lead.created_at)}</p><Link href={`/leads/${lead.lead_id}`} className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-semibold text-[#5d503c] hover:border-[#d7b258] hover:text-[#060710]">Open</Link></div>
                          </div>
                        </article>
                      )) : <div className="rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-12 text-center text-sm text-[#7a6b57]">No leads loaded yet.</div>}
                    </div>
                  </section>

                  <section className={PANEL}>
                    <div className="mb-5">
                      <p className={KICKER}>Source and Product Mix</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Where the floor is moving from</h3>
                    </div>
                    <div className="space-y-3">
                      {focusSources.length ? focusSources.map((item) => (
                        <div key={item.lead_source || "unknown"} className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[#060710]">{titleize(item.lead_source || "unknown")}</p>
                              <p className="mt-1 text-xs text-[#8f816a]">Visible feed in current scope</p>
                            </div>
                            <span className="text-xl font-black text-[#8d6e27]">{compact(item.total)}</span>
                          </div>
                        </div>
                      )) : <div className="rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-12 text-center text-sm text-[#7a6b57]">No source mix available yet.</div>}
                    </div>
                    <div className="mt-4 grid gap-3">
                      {products.length ? products.slice(0, 4).map((product) => (
                        <div key={product.product_id} className="rounded-[24px] border border-[#eadfcd] bg-white/78 px-4 py-4">
                          <p className="text-sm font-semibold text-[#060710]">{product.name || "Unnamed product"}</p>
                          <p className="mt-1 text-xs text-[#8f816a]">{product.category || "General category"}</p>
                          <p className="mt-3 text-xs font-semibold text-[#8d6e27]">{when(product.created_at)}</p>
                        </div>
                      )) : null}
                    </div>
                  </section>
                </div>
              </div>
            ) : null}
          </>
        );
      }}
    </WorkspacePage>
  );
}
