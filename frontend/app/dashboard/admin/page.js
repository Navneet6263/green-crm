"use client";

import Link from "next/link";

import WorkspacePage from "../../../components/dashboard/WorkspacePage";
import DashboardIcon from "../../../components/dashboard/icons";
import LeadQuickStatusControl from "../../../components/leads/LeadQuickStatusControl";

const PANEL = "rounded-[30px] border border-[#eadfcd] bg-white/84 p-5 shadow-[0_14px_36px_rgba(79,58,22,0.06)] md:p-6";
const SOFT = "rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4";
const DARK_PANEL = "rounded-[32px] border border-[#1d1a12] bg-[linear-gradient(155deg,#10111d_0%,#171a28_58%,#25212d_100%)] p-5 text-white shadow-[0_24px_80px_rgba(6,7,16,0.28)] md:p-6";
const KICKER = "text-[10px] font-black uppercase tracking-[0.28em] text-[#9a886d]";

const STATUS_TONE = {
  new: "bg-[#eef5ff] text-[#2563eb] ring-[#cfe0ff]",
  contacted: "bg-[#ecfbff] text-[#0f8da8] ring-[#c8eef4]",
  qualified: "bg-[#f5efff] text-[#7c3aed] ring-[#e4d8ff]",
  proposal: "bg-[#fff4d9] text-[#8d6e27] ring-[#ecdcae]",
  negotiation: "bg-[#fff0e2] text-[#c56b1c] ring-[#f0d3bc]",
  won: "bg-[#ebf8ee] text-[#217346] ring-[#ccead5]",
  "closed-won": "bg-[#ebf8ee] text-[#217346] ring-[#ccead5]",
  "closed-lost": "bg-[#fff0f0] text-[#b63b3b] ring-[#f3caca]",
};

const ROLE_TONE = {
  admin: "bg-[#fff4d9] text-[#8d6e27]",
  manager: "bg-[#f6efe2] text-[#5d503c]",
  sales: "bg-[#ebf8ee] text-[#217346]",
  marketing: "bg-[#fff2e8] text-[#b4681f]",
  support: "bg-[#eef5ff] text-[#2563eb]",
  "legal-team": "bg-[#fff0e2] text-[#c56b1c]",
  "finance-team": "bg-[#fff7d9] text-[#8d6e27]",
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

function SectionHead({ eyebrow, title, copy, action }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        <p className={KICKER}>{eyebrow}</p>
        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">{title}</h3>
        {copy ? <p className="mt-2 text-sm leading-6 text-[#8f816a]">{copy}</p> : null}
      </div>
      {action}
    </div>
  );
}

function ActionRailLink({ href, icon, title, copy, tone }) {
  return (
    <Link
      href={href}
      prefetch={false}
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

function MetricTile({ label, value, hint, color }) {
  return (
    <article className="rounded-[24px] border border-[#eadfcd] bg-white/84 px-4 py-4 shadow-[0_10px_24px_rgba(79,58,22,0.06)]">
      <span className={KICKER}>{label}</span>
      <strong className="mt-3 block text-[2rem] font-black leading-none" style={{ color }}>
        {compact(value)}
      </strong>
      <p className="mt-2 text-xs text-[#8f816a]">{hint}</p>
    </article>
  );
}

function ProgressRow({ label, value, total, tone }) {
  const percent = total > 0 ? Math.max(8, Math.round((Number(value || 0) / Number(total || 1)) * 100)) : 8;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-[#5d503c]">{label}</span>
        <span className="font-black text-[#060710]">{compact(value)}</span>
      </div>
      <div className="h-3 rounded-full bg-[#f5ecdc]">
        <div className={`h-3 rounded-full ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
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
        { key: "leads", path: "/leads?page_size=8" },
        { key: "users", path: "/users?page_size=10" },
        { key: "tasks", path: "/tasks?page_size=8" },
        { key: "reminders", path: "/leads/reminders?page_size=8" },
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
        const activeUsers = users.filter((user) => user.is_active !== false).length;
        const unassignedLeads = leads.filter((lead) => !lead.assigned_to && !lead.assigned_to_name).length;
        const hotLeads = leads.filter((lead) => ["high", "urgent"].includes(String(lead.priority || "").toLowerCase())).length;
        const noFollowUpLeads = leads.filter((lead) => !lead.follow_up_date).length;
        const overdueTasks = tasks.filter((task) => {
          if (!task?.due_date) return false;
          const due = new Date(task.due_date);
          return !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
        }).length;
        const totalVisibleQueue = tasks.length + reminders.length;
        const sourceRadar = [...sourceMix].sort((a, b) => Number(b.total || 0) - Number(a.total || 0)).slice(0, 5);
        const statusMix = [...leadCounts].sort((a, b) => Number(b.total || 0) - Number(a.total || 0)).slice(0, 5);
        const watchLeads = [...leads]
          .sort((a, b) => Number(b.estimated_value || 0) - Number(a.estimated_value || 0))
          .slice(0, 5);
        const roleMix = Object.entries(
          users.reduce((acc, user) => {
            const key = String(user.role || "user").toLowerCase();
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {})
        )
          .map(([role, total]) => ({ role, total }))
          .sort((a, b) => Number(b.total || 0) - Number(a.total || 0));
        const executionQueue = [
          ...reminders.map((item) => ({
            id: `reminder-${item.reminder_id}`,
            type: "Reminder",
            title: item.company_name || "Untitled reminder",
            owner: item.contact_person_name || item.assigned_to_name || "No contact",
            due: item.due_at,
            tone: "bg-[#fff4d9] text-[#8d6e27]",
          })),
          ...tasks.map((item) => ({
            id: `task-${item.task_id}`,
            type: titleize(item.status || item.type || "Task"),
            title: item.title || "Untitled task",
            owner: item.assigned_to_name || item.owner_name || "Unassigned",
            due: item.due_date,
            tone: overdueTasks && item.due_date && new Date(item.due_date).getTime() < Date.now() ? "bg-[#fff0e2] text-[#c56b1c]" : "bg-[#f6efe2] text-[#5d503c]",
          })),
        ].slice(0, 8);

        return (
          <>
            {error ? <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}
            {loading ? (
              <div className="flex items-center gap-3 py-10 text-sm text-[#8f816a]">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#cba952] border-t-transparent" />
                Loading admin command deck...
              </div>
            ) : null}

            {!loading ? (
              <div className="flex flex-col gap-5">
                <section className="overflow-hidden rounded-[36px] border border-[#eadfcd] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(250,241,221,0.98)_44%,_rgba(245,231,193,0.98)_100%)] shadow-[0_24px_70px_rgba(79,58,22,0.08)]">
                  <div className="space-y-5 px-5 py-6 md:px-7 md:py-7">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <MetricTile label="Visible Leads" value={totalLeads} hint="Current tenant-facing pipeline" color="#060710" />
                      <MetricTile label="Open Pipeline" value={openPipeline} hint="Active commercial stages" color="#8d6e27" />
                      <MetricTile label="Closed Won" value={wonLeads} hint="Wins inside current summary" color="#217346" />
                      <MetricTile label="Live Team" value={activeUsers || summary.team_size || 0} hint="Active users in workspace" color="#5d503c" />
                    </div>

                    <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
                      <div className="rounded-[30px] border border-[#eadfcd] bg-white/84 p-5 shadow-[0_14px_36px_rgba(79,58,22,0.06)]">
                        <div className="mb-5">
                          <p className={KICKER}>Admin Focus</p>
                          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Push the day from the right levers.</h3>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <ActionRailLink href="/leads/new" icon="leads" title="Create Lead" copy="Start a fresh pipeline record." tone="bg-[#fff0c8] text-[#8d6e27]" />
                          <ActionRailLink href="/leads" icon="dashboard" title="Lead Workspace" copy="Review stage movement and ownership." tone="bg-[#fff7e8] text-[#8d6e27]" />
                          <ActionRailLink href="/settings/users" icon="users" title="Team Control" copy="Manage roles, activation, and seats." tone="bg-[#f6efe2] text-[#5d503c]" />
                          <ActionRailLink href="/settings/products" icon="products" title="Product Palette" copy="Adjust products and active catalog." tone="bg-[#ebf8ee] text-[#217346]" />
                        </div>
                      </div>

                      <div className={DARK_PANEL}>
                        <div className="mb-5">
                          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">Quick Read</p>
                          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">Small admin signals worth noticing.</h3>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          {[
                            { label: "High Priority", value: hotLeads },
                            { label: "Unassigned Leads", value: unassignedLeads },
                            { label: "No Follow-up", value: noFollowUpLeads },
                            { label: "Queue Load", value: totalVisibleQueue },
                          ].map((item) => (
                            <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">{item.label}</p>
                              <p className="mt-3 text-2xl font-black tracking-tight text-white">{compact(item.value)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                  <section className={PANEL}>
                    <SectionHead
                      eyebrow="Pipeline Watch"
                      title="Lead watchlist"
                      copy="High-value and fresh pipeline movement with visible status, owner, and workflow."
                      action={<Link prefetch={false} href="/leads" className="rounded-[16px] border border-[#eadfcd] bg-white px-4 py-2 text-xs font-semibold text-[#5d503c] transition hover:border-[#d7b258] hover:text-[#060710]">View all leads</Link>}
                    />
                    <div className="space-y-3">
                      {watchLeads.length ? watchLeads.map((lead) => (
                        <article
                          key={lead.lead_id}
                          className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4 transition hover:-translate-y-0.5 hover:border-[#d7b258] hover:bg-white"
                        >
                          <div className="flex items-start gap-3">
                            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#10111d] text-sm font-black text-white">
                              {initials(lead.company_name || lead.contact_person || "Lead")}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <Link prefetch={false} href={`/leads/${lead.lead_id}`} className="truncate text-sm font-semibold text-[#060710] hover:text-[#8d6e27]">
                                    {lead.company_name || "Unnamed lead"}
                                  </Link>
                                  <p className="truncate text-xs text-[#8f816a]">{lead.contact_person || "No contact"} | {lead.assigned_to_name || "Unassigned"}</p>
                                </div>
                                <div className="space-y-2 text-right">
                                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${STATUS_TONE[lead.status] || "bg-[#f6efe2] text-[#5d503c] ring-[#eadfcd]"}`}>
                                    {titleize(lead.status || "new")}
                                  </span>
                                  <LeadQuickStatusControl lead={lead} token={session?.token} onUpdated={() => refresh?.()} />
                                </div>
                              </div>
                              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                <div><p className={KICKER}>Value</p><strong className="mt-2 block text-base font-black text-[#060710]">{money(lead.estimated_value)}</strong></div>
                                <div><p className={KICKER}>Workflow</p><strong className="mt-2 block text-base font-black text-[#5d503c]">{titleize(lead.workflow_stage || "sales")}</strong></div>
                                <div className="space-y-2"><p className={KICKER}>Created</p><strong className="mt-2 block text-base font-black text-[#8d6e27]">{when(lead.created_at)}</strong><Link prefetch={false} href={`/leads/${lead.lead_id}`} className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-semibold text-[#5d503c] hover:border-[#d7b258] hover:text-[#060710]">Open</Link></div>
                              </div>
                            </div>
                          </div>
                        </article>
                      )) : <div className="rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-12 text-center text-sm text-[#7a6b57]">No lead watchlist data available yet.</div>}
                    </div>
                  </section>

                  <section className={PANEL}>
                    <SectionHead
                      eyebrow="Execution Queue"
                      title="Follow-up and task pressure"
                      copy="See what is slipping first so the admin desk can intervene fast."
                      action={<Link prefetch={false} href="/tasks" className="rounded-[16px] border border-[#eadfcd] bg-white px-4 py-2 text-xs font-semibold text-[#5d503c] transition hover:border-[#d7b258] hover:text-[#060710]">Open tasks</Link>}
                    />
                    <div className="space-y-3">
                      {executionQueue.length ? executionQueue.map((item) => (
                        <div key={item.id} className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#060710]">{item.title}</p>
                              <p className="mt-1 truncate text-xs text-[#8f816a]">{item.owner}</p>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${item.tone}`}>{item.type}</span>
                          </div>
                          <p className="mt-3 text-xs font-semibold text-[#5d503c]">Due {when(item.due, true)}</p>
                        </div>
                      )) : <div className="rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-12 text-center text-sm text-[#7a6b57]">No execution queue pressure right now.</div>}
                    </div>
                  </section>
                </div>

                <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                  <section className={PANEL}>
                    <SectionHead
                      eyebrow="Team Surface"
                      title="Role and roster coverage"
                      copy="Who is active inside the tenant, and how the current role mix looks."
                      action={<Link prefetch={false} href="/settings/users" className="rounded-[16px] border border-[#eadfcd] bg-white px-4 py-2 text-xs font-semibold text-[#5d503c] transition hover:border-[#d7b258] hover:text-[#060710]">Manage team</Link>}
                    />
                    <div className="space-y-5">
                      <div className="space-y-3">
                        {roleMix.length ? roleMix.map((item) => (
                          <ProgressRow
                            key={item.role}
                            label={titleize(item.role)}
                            value={item.total}
                            total={users.length || 1}
                            tone="bg-[linear-gradient(90deg,#cba952_0%,#e9d089_100%)]"
                          />
                        )) : <div className="rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-10 text-center text-sm text-[#7a6b57]">No role data available yet.</div>}
                      </div>

                      <div className="grid gap-3">
                        {users.slice(0, 5).map((user) => (
                          <div key={user.user_id} className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                            <div className="flex items-start gap-3">
                              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#10111d] text-sm font-black text-white">
                                {initials(user.name || user.full_name || "User")}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-[#060710]">{user.name || user.full_name || "Unknown user"}</p>
                                    <p className="truncate text-xs text-[#8f816a]">{user.email || "No email"} | {user.talent_id || "No ID"}</p>
                                  </div>
                                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${ROLE_TONE[user.role] || "bg-[#f6efe2] text-[#5d503c]"}`}>
                                    {titleize(user.role || "user")}
                                  </span>
                                </div>
                                <p className={`mt-3 text-xs font-semibold ${user.is_active === false ? "text-[#b63b3b]" : "text-[#217346]"}`}>
                                  {user.is_active === false ? "Inactive" : "Active"}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section className={PANEL}>
                    <SectionHead
                      eyebrow="Source and Stage Radar"
                      title="Where the tenant is getting pull"
                      copy="See stage density and source contribution without leaving the control room."
                    />
                    <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                      <div className="space-y-3">
                        {sourceRadar.length ? sourceRadar.map((item) => (
                          <div key={item.lead_source || "unknown"} className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-[#060710]">{titleize(item.lead_source || "unknown")}</p>
                                <p className="mt-1 text-xs text-[#8f816a]">Active acquisition channel</p>
                              </div>
                              <strong className="text-lg font-black text-[#8d6e27]">{compact(item.total)}</strong>
                            </div>
                          </div>
                        )) : <div className="rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-10 text-center text-sm text-[#7a6b57]">No source mix available yet.</div>}
                      </div>

                      <div className="space-y-3">
                        {statusMix.length ? statusMix.map((item) => (
                          <div key={item.status} className="rounded-[24px] border border-[#eadfcd] bg-white/78 px-4 py-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${STATUS_TONE[item.status] || "bg-[#f6efe2] text-[#5d503c] ring-[#eadfcd]"}`}>
                                {titleize(item.status)}
                              </span>
                              <strong className="text-lg font-black text-[#060710]">{compact(item.total)}</strong>
                            </div>
                            <div className="h-3 rounded-full bg-[#f5ecdc]">
                              <div
                                className="h-3 rounded-full bg-[linear-gradient(90deg,#cba952_0%,#e9d089_100%)]"
                                style={{ width: `${Math.max(8, Math.round((Number(item.total || 0) / Math.max(totalLeads, 1)) * 100))}%` }}
                              />
                            </div>
                          </div>
                        )) : <div className="rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-10 text-center text-sm text-[#7a6b57]">No stage visibility available yet.</div>}
                      </div>
                    </div>
                  </section>
                </div>

                <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                  <section className={PANEL}>
                    <SectionHead
                      eyebrow="Product Pulse"
                      title="Recent catalog visibility"
                      copy="See which products are currently shaping the tenant surface."
                      action={<Link prefetch={false} href="/settings/products" className="rounded-[16px] border border-[#eadfcd] bg-white px-4 py-2 text-xs font-semibold text-[#5d503c] transition hover:border-[#d7b258] hover:text-[#060710]">Manage products</Link>}
                    />
                    <div className="grid gap-3 md:grid-cols-2">
                      {products.length ? products.slice(0, 4).map((product) => (
                        <div key={product.product_id} className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                          <div className="flex items-start gap-3">
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#10111d] text-white">
                              <DashboardIcon name="products" className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-[#060710]">{product.name || "Unnamed product"}</p>
                              <p className="mt-1 text-xs text-[#8f816a]">{product.category || "General category"}</p>
                              <p className="mt-3 text-xs font-semibold text-[#5d503c]">Added {when(product.created_at)}</p>
                            </div>
                          </div>
                        </div>
                      )) : <div className="rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-10 text-center text-sm text-[#7a6b57] md:col-span-2">No recent products available yet.</div>}
                    </div>
                  </section>

                  <section className={PANEL}>
                    <SectionHead
                      eyebrow="Admin Signals"
                      title="Small things worth noticing"
                      copy="Quick checks that help the admin desk act before the queue gets noisy."
                    />
                    <div className="grid gap-3 md:grid-cols-2">
                      {[
                        { label: "Reminder Heat", value: reminders.length, copy: "Leads currently waiting for a scheduled follow-up." },
                        { label: "Overdue Tasks", value: overdueTasks, copy: "Execution items already behind target." },
                        { label: "Unassigned Leads", value: unassignedLeads, copy: "Records that still need an owner." },
                        { label: "Won Rate", value: totalLeads ? `${Math.round((wonLeads / totalLeads) * 100)}%` : "0%", copy: "Closed-won share against visible tenant leads." },
                      ].map((item) => (
                        <div key={item.label} className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                          <p className={KICKER}>{item.label}</p>
                          <strong className="mt-3 block text-2xl font-black text-[#060710]">{item.value}</strong>
                          <p className="mt-2 text-sm leading-6 text-[#8f816a]">{item.copy}</p>
                        </div>
                      ))}
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
