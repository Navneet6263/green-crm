"use client";

import Link from "next/link";

import WorkspacePage from "../../../components/dashboard/WorkspacePage";
import DashboardIcon from "../../../components/dashboard/icons";

function fmt(value) {
  const num = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    notation: num >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(num);
}

function fmtDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "--"
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
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

const STATUS_TONE = {
  new: "bg-[#fff4d9] text-[#8d6e27] ring-[#e7d7ab]",
  contacted: "bg-[#fff7e8] text-[#8d6e27] ring-[#eadfcd]",
  qualified: "bg-[#f6efe2] text-[#5d503c] ring-[#eadfcd]",
  proposal: "bg-amber-50 text-amber-700 ring-amber-200",
  negotiation: "bg-orange-50 text-orange-700 ring-orange-200",
  won: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "closed-won": "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const ROLE_TONE = {
  admin: "bg-[#fff4d9] text-[#8d6e27]",
  manager: "bg-[#fff7e8] text-[#8d6e27]",
  sales: "bg-[#f6efe2] text-[#5d503c]",
  marketing: "bg-[#f8efe7] text-[#8d6e27]",
  support: "bg-[#fff7e8] text-[#8d6e27]",
  "legal-team": "bg-[#fff0d8] text-[#a26318]",
  "finance-team": "bg-[#fff4d9] text-[#8d6e27]",
};

function PanelHead({ eyebrow, title, copy, action }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">{eyebrow}</span>
        <h2 className="mt-1 text-sm font-bold text-slate-800">{title}</h2>
        {copy ? <p className="mt-1 text-xs text-slate-400">{copy}</p> : null}
      </div>
      {action}
    </div>
  );
}

function QuickLink({ href, icon, title, desc, tone }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-[#eadfcd] bg-white/88 px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-[#d7b258] hover:bg-[#fffaf1] hover:shadow-[0_14px_32px_rgba(79,58,22,0.08)]"
    >
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}>
        <DashboardIcon name={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="truncate text-xs text-slate-400">{desc}</p>
      </div>
    </Link>
  );
}

export default function AdminDashboard() {
  return (
    <WorkspacePage
      title="Admin Dashboard"
      eyebrow="Company Workspace"
      hideTitle
      allowedRoles={["admin"]}
      requestBuilder={() => [
        { key: "summary", path: "/dashboard/summary" },
        { key: "leads", path: "/leads?page_size=6" },
        { key: "users", path: "/users?page_size=6" },
        { key: "tasks", path: "/tasks?page_size=5" },
        { key: "reminders", path: "/leads/reminders?page_size=5" },
      ]}
      heroStats={({ data }) => {
        const summary = data?.summary || {};
        const leadCounts = summary.lead_counts || [];
        return [
          { label: "Total Leads", value: leadCounts.reduce((sum, item) => sum + Number(item.total || 0), 0), color: "#8d6e27" },
          { label: "Closed Won", value: leadCounts.find((item) => item.status === "closed-won" || item.status === "won")?.total || 0, color: "#1f5134" },
          { label: "Team Size", value: summary.team_size || 0, color: "#5d503c" },
          { label: "Pending Follow-ups", value: summary.pending_reminders || 0, color: "#d97706" },
        ];
      }}
    >
      {({ data, error, loading }) => {
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
        const statusMix = [...leadCounts].sort((a, b) => Number(b.total || 0) - Number(a.total || 0)).slice(0, 4);

        return (
          <>
            {error ? <div className="mb-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}
            {loading ? (
              <div className="flex items-center gap-3 py-10 text-sm text-slate-400">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#cba952] border-t-transparent" />
                Loading admin workspace...
              </div>
            ) : null}

            {!loading ? (
              <div className="flex flex-col gap-5">
                <section className="overflow-hidden rounded-[34px] border border-[#eadfcd] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(250,241,221,0.98)_42%,_rgba(245,231,193,0.98)_100%)] shadow-[0_24px_70px_rgba(79,58,22,0.08)]">
                  <div className="grid gap-6 px-5 py-6 md:px-7 md:py-7 xl:grid-cols-[1.4fr_1fr]">
                    <div className="space-y-5">
                      <div className="space-y-3">
                        <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/88 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
                          Admin Desk
                        </span>
                        <div className="space-y-2">
                          <h2 className="max-w-3xl text-2xl font-bold leading-tight text-slate-900 md:text-3xl">
                            Run leads, team visibility, and follow-through from one cleaner admin cockpit.
                          </h2>
                          <p className="max-w-2xl text-sm leading-6 text-slate-500">
                            Pipeline, reminders, team activity, and task pressure now sit in one warmer control surface.
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {[
                          { label: "Open Pipeline", value: openPipeline, tone: "bg-[#fff4d9] text-[#8d6e27]", icon: "dashboard" },
                          { label: "Tracked Leads", value: totalLeads, tone: "bg-[#fff7e8] text-[#8d6e27]", icon: "leads" },
                          { label: "Team Capacity", value: summary.team_size || users.length, tone: "bg-[#f6efe2] text-[#5d503c]", icon: "users" },
                          { label: "Pending Tasks", value: summary.pending_tasks || tasks.length, tone: "bg-amber-50 text-amber-600", icon: "tasks" },
                        ].map((card) => (
                          <div key={card.label} className="rounded-[24px] border border-[#eadfcd] bg-white/82 p-4 shadow-[0_12px_30px_rgba(79,58,22,0.06)]">
                            <div className="mb-3 flex items-center gap-2.5">
                              <span className={`grid h-9 w-9 place-items-center rounded-xl ${card.tone}`}>
                                <DashboardIcon name={card.icon} className="h-4 w-4" />
                              </span>
                              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">{card.label}</span>
                            </div>
                            <p className="text-2xl font-bold leading-none text-slate-900">{fmt(card.value)}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 rounded-[28px] border border-[#eadfcd] bg-white/84 p-5 shadow-[0_14px_38px_rgba(79,58,22,0.06)] backdrop-blur">
                      <PanelHead eyebrow="Quick Actions" title="Move the workspace" copy="Jump into the main admin surfaces." />
                      <div className="grid gap-3">
                        <QuickLink href="/leads/new" icon="leads" title="Create Lead" desc="Start a fresh pipeline record." tone="bg-[#fff0c8] text-[#8d6e27]" />
                        <QuickLink href="/leads" icon="dashboard" title="Lead Workspace" desc="Review active lead movement." tone="bg-[#fff7e8] text-[#8d6e27]" />
                        <QuickLink href="/settings/users" icon="users" title="Team Management" desc="Control roles and activation." tone="bg-[#f6efe2] text-[#5d503c]" />
                        <QuickLink href="/analytics" icon="analytics" title="Analytics" desc="Read source mix and funnel shape." tone="bg-[#fff4d9] text-[#8d6e27]" />
                      </div>
                    </div>
                  </div>
                </section>

                <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
                  <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                    <PanelHead eyebrow="Pipeline" title="Recent leads" copy="Latest tenant leads with status, workflow, and value context." action={<Link href="/leads" className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">View all</Link>} />
                    <div className="grid gap-3">
                      {leads.length ? leads.map((lead) => (
                        <Link key={lead.lead_id} href={`/leads/${lead.lead_id}`} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 transition-all hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white hover:shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-sm font-bold text-white">{initials(lead.company_name)}</span>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-800">{lead.company_name || "Unnamed lead"}</p>
                                <p className="truncate text-xs text-slate-400">{lead.contact_person || lead.contact_person_name || "No contact on file"}</p>
                              </div>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${STATUS_TONE[lead.status] || "bg-slate-100 text-slate-600 ring-slate-200"}`}>
                              {titleize(lead.status || "new")}
                            </span>
                          </div>
                          <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
                            <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Value</p><p className="mt-1 font-semibold text-slate-700">INR {Number(lead.estimated_value || 0).toLocaleString("en-IN")}</p></div>
                            <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Workflow</p><p className="mt-1 font-semibold text-slate-700">{titleize(lead.workflow_stage || "sales")}</p></div>
                            <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Added</p><p className="mt-1 font-semibold text-slate-700">{fmtDate(lead.created_at)}</p></div>
                          </div>
                        </Link>
                      )) : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-400">No recent leads yet.</div>}
                    </div>
                  </section>

                  <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                    <PanelHead eyebrow="Team" title="Visible team snapshot" copy="Recent users with clear role hierarchy." action={<Link href="/settings/users" className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">Manage team</Link>} />
                    <div className="grid gap-3">
                      {users.length ? users.map((user) => (
                        <div key={user.user_id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                          <div className="flex items-start gap-3">
                            <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 text-sm font-bold text-white">{initials(user.name || user.full_name)}</span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-800">{user.name || user.full_name || "Unknown user"}</p>
                                  <p className="truncate text-xs text-slate-400">{user.email || "No email on file"}</p>
                                </div>
                                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${ROLE_TONE[user.role] || "bg-slate-100 text-slate-600"}`}>{titleize(user.role || "user")}</span>
                              </div>
                              <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500">
                                <span>{user.talent_id || "No talent ID"}</span>
                                <span className={user.is_active === false ? "text-rose-600" : "text-emerald-600"}>{user.is_active === false ? "Inactive" : "Active"}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )) : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-400">No team members loaded.</div>}
                    </div>
                  </section>
                </div>

                <div className="grid gap-5 xl:grid-cols-3">
                  <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                    <PanelHead eyebrow="Follow-ups" title="Reminder queue" copy="Upcoming lead reminders needing attention." />
                    <div className="grid gap-3">
                      {reminders.length ? reminders.map((item) => (
                        <div key={item.reminder_id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                          <p className="text-sm font-semibold text-slate-800">{item.company_name || "Untitled account"}</p>
                          <p className="mt-1 text-xs text-slate-400">{item.contact_person_name || "No contact"} | {fmtDate(item.due_at)}</p>
                        </div>
                      )) : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-400">No follow-up reminders queued.</div>}
                    </div>
                  </section>

                  <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                    <PanelHead eyebrow="Execution" title="Pending tasks" copy="Compact view of the current admin workload." action={<Link href="/tasks" className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">Open tasks</Link>} />
                    <div className="grid gap-3">
                      {tasks.length ? tasks.map((task) => (
                        <div key={task.task_id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                          <p className="text-sm font-semibold text-slate-800">{task.title || "Untitled task"}</p>
                          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
                            <span>{titleize(task.status || task.type || "task")}</span>
                            <span>{fmtDate(task.due_date)}</span>
                          </div>
                        </div>
                      )) : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-400">No pending tasks right now.</div>}
                    </div>
                  </section>

                  <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                    <PanelHead eyebrow="Catalog" title="Recent products" copy="Latest product entries visible in the tenant summary." action={<Link href="/settings/products" className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">Manage products</Link>} />
                    <div className="grid gap-3">
                      {products.length ? products.map((product) => (
                        <div key={product.product_id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                          <p className="text-sm font-semibold text-slate-800">{product.name || "Unnamed product"}</p>
                          <p className="mt-1 text-xs text-slate-400">{product.category || "General category"}</p>
                          <p className="mt-3 text-xs text-slate-500">{fmtDate(product.created_at)}</p>
                        </div>
                      )) : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-400">No recent products available.</div>}
                    </div>
                  </section>
                </div>

                <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
                  <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                    <PanelHead eyebrow="Status Mix" title="Pipeline coverage" copy="The most visible lead states across the tenant summary." />
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {statusMix.length ? statusMix.map((item) => (
                        <div key={item.status} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${STATUS_TONE[item.status] || "bg-slate-100 text-slate-600 ring-slate-200"}`}>{titleize(item.status)}</span>
                          <p className="mt-4 text-2xl font-bold text-slate-900">{fmt(item.total)}</p>
                        </div>
                      )) : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-400 sm:col-span-2 xl:col-span-4">No pipeline status data available yet.</div>}
                    </div>
                  </section>

                  <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                    <PanelHead eyebrow="Source Mix" title="Channel visibility" copy="Top lead sources currently visible to the admin workspace." />
                    <div className="grid gap-3">
                      {sourceMix.length ? sourceMix.map((item) => (
                        <div key={item.lead_source || "unknown-source"} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{titleize(item.lead_source || "unknown")}</p>
                              <p className="mt-1 text-xs text-slate-400">Visible from the current company summary feed.</p>
                            </div>
                            <span className="text-lg font-bold text-slate-800">{fmt(item.total)}</span>
                          </div>
                        </div>
                      )) : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-400">No source mix available yet.</div>}
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
