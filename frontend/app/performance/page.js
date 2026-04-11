"use client";

import Link from "next/link";

import WorkspacePage from "../../components/dashboard/WorkspacePage";
import DashboardIcon from "../../components/dashboard/icons";

const PANEL = "rounded-[30px] border border-[#eadfcd] bg-white/84 p-5 shadow-[0_14px_36px_rgba(79,58,22,0.06)] md:p-6";
const SOFT = "rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4";
const KICKER = "text-[10px] font-black uppercase tracking-[0.28em] text-[#9a886d]";
const ROLE_TONE = {
  sales: "bg-[#ebf8ee] text-[#217346]",
  marketing: "bg-[#fff2e8] text-[#b4681f]",
  support: "bg-[#eef5ff] text-[#2563eb]",
  "legal-team": "bg-[#fff0e2] text-[#c56b1c]",
  "finance-team": "bg-[#fff4d9] text-[#8d6e27]",
  viewer: "bg-[#f6efe2] text-[#5d503c]",
};
const STATUS_TONE = {
  new: "bg-[#eef4ff] text-[#2563eb] ring-[#d7e4ff]",
  contacted: "bg-[#fff4d9] text-[#8d6e27] ring-[#f0dfaa]",
  qualified: "bg-[#ebf8ee] text-[#217346] ring-[#ccebd7]",
  negotiation: "bg-[#fff2e8] text-[#b4681f] ring-[#f1ddc8]",
  won: "bg-[#e8f8ee] text-[#1f7a46] ring-[#c9e7d7]",
  "closed-won": "bg-[#e8f8ee] text-[#1f7a46] ring-[#c9e7d7]",
  "closed-lost": "bg-[#fbe9e7] text-[#b85a3f] ring-[#f0cfc8]",
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

function when(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
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

function pendingTask(task) {
  return !["done", "completed", "closed"].includes(String(task?.status || "").toLowerCase());
}

export default function PerformancePage() {
  return (
    <WorkspacePage
      title="Team Performance"
      eyebrow="User Output"
      hideTitle
      allowedRoles={["manager", "admin"]}
      requestBuilder={() => [
        { key: "users", path: "/users?page_size=1000&analytics=1" },
        { key: "tasks", path: "/tasks?page_size=1000&analytics=1" },
        { key: "leads", path: "/leads?page_size=1000&analytics=1" },
      ]}
      heroStats={() => []}
    >
      {({ session, data, error, loading }) => {
        const role = session?.user?.role || "";
        const users = data?.users?.items || [];
        const tasks = data?.tasks?.items || [];
        const leads = data?.leads?.items || [];

        const teamUsers = users.filter((user) => {
          const normalizedRole = String(user.role || "").toLowerCase();
          if (role !== "manager") {
            return !["super-admin", "platform-admin", "platform-manager"].includes(normalizedRole);
          }
          return !["manager", "admin", "super-admin", "platform-admin", "platform-manager"].includes(normalizedRole);
        });

        const teamUserIds = new Set(teamUsers.map((user) => user.user_id));
        const teamUserNames = new Set(teamUsers.map((user) => user.name || user.full_name).filter(Boolean));
        const visibleLeads = leads.filter(
          (lead) =>
            teamUserIds.has(lead.assigned_to) ||
            teamUserIds.has(lead.created_by) ||
            teamUserNames.has(lead.assigned_to_name) ||
            teamUserNames.has(lead.created_by_name)
        );
        const visibleTasks = tasks.filter(
          (task) =>
            teamUserIds.has(task.assigned_to) ||
            teamUserNames.has(task.assigned_to_name) ||
            teamUserNames.has(task.owner_name)
        );

        const stageCounts = visibleLeads.reduce((acc, lead) => {
          const key = String(lead.status || "new").toLowerCase();
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
        const sourceCounts = visibleLeads.reduce((acc, lead) => {
          const key = String(lead.lead_source || "unknown").toLowerCase();
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});

        const teamBoard = teamUsers
          .map((user) => {
            const ownedLeads = visibleLeads.filter(
              (lead) =>
                lead.assigned_to === user.user_id ||
                lead.created_by === user.user_id ||
                lead.assigned_to_name === (user.name || user.full_name)
            );
            const ownedTasks = visibleTasks.filter(
              (task) =>
                task.assigned_to === user.user_id ||
                task.assigned_to_name === (user.name || user.full_name) ||
                task.owner_name === (user.name || user.full_name)
            );
            const wonLeads = ownedLeads.filter((lead) => ["won", "closed-won"].includes(String(lead.status || "").toLowerCase())).length;
            const pendingTasks = ownedTasks.filter(pendingTask);
            const overdueTasks = pendingTasks.filter((task) => {
              if (!task?.due_date) return false;
              const due = new Date(task.due_date);
              return !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
            }).length;

            return {
              ...user,
              displayName: user.name || user.full_name || "Unknown",
              ownedLeads,
              ownedTasks,
              wonLeads,
              pendingTasks: pendingTasks.length,
              overdueTasks,
            };
          })
          .sort((a, b) => b.wonLeads - a.wonLeads || b.ownedLeads.length - a.ownedLeads.length || a.overdueTasks - b.overdueTasks);

        const spotlight = teamBoard[0] || null;
        const activeStaff = teamBoard.filter((user) => user.is_active !== false).length;
        const overdueTasks = teamBoard.reduce((sum, user) => sum + user.overdueTasks, 0);
        const wonLeads = teamBoard.reduce((sum, user) => sum + user.wonLeads, 0);
        const sourceMix = Object.entries(sourceCounts)
          .map(([lead_source, total]) => ({ lead_source, total }))
          .sort((a, b) => Number(b.total || 0) - Number(a.total || 0))
          .slice(0, 4);
        const stageMix = Object.entries(stageCounts)
          .map(([status, total]) => ({ status, total }))
          .sort((a, b) => Number(b.total || 0) - Number(a.total || 0))
          .slice(0, 5);
        const openLeads = visibleLeads.filter((lead) => !["won", "closed-won", "closed-lost"].includes(String(lead.status || "").toLowerCase())).length;

        return (
          <>
            {error ? <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}
            {loading ? (
              <div className="flex items-center gap-3 py-10 text-sm text-[#8f816a]">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#cba952] border-t-transparent" />
                Loading performance desk...
              </div>
            ) : null}

            {!loading ? (
              <div className="flex flex-col gap-5">
                <section className="overflow-hidden rounded-[36px] border border-[#eadfcd] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(250,241,221,0.98)_44%,_rgba(245,231,193,0.98)_100%)] shadow-[0_24px_70px_rgba(79,58,22,0.08)]">
                  <div className="grid gap-6 px-5 py-6 md:px-7 md:py-7 xl:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-5">
                      <div className="space-y-3">
                        <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/88 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
                          Performance Desk
                        </span>
                        <div className="space-y-2">
                          <h2 className="max-w-4xl text-[2.3rem] font-semibold leading-[1.02] tracking-tight text-[#060710] md:text-[3.2rem]">
                            Review team performance, lead conversions, and task completion across your team.
                          </h2>
                          <p className="max-w-2xl text-sm leading-7 text-[#746853] md:text-base">
                            Reps, tasks, wins, overdue movement, and stage depth all stay visible without the older stacked performance view.
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {[
                          { label: "Team Under Review", value: teamBoard.length, hint: "Filtered for the current manager scope", color: "#060710" },
                          { label: "Active Staff", value: activeStaff, hint: "Currently active team IDs", color: "#217346" },
                          { label: "Open Leads", value: openLeads, hint: "Need movement or follow-up", color: "#8d6e27" },
                          { label: "Overdue Tasks", value: overdueTasks, hint: "Needs intervention now", color: "#c56b1c" },
                        ].map((card) => (
                          <article key={card.label} className="rounded-[24px] border border-[#eadfcd] bg-white/84 px-4 py-4 shadow-[0_10px_24px_rgba(79,58,22,0.06)]">
                            <span className={KICKER}>{card.label}</span>
                            <strong className="mt-3 block text-[2rem] font-black leading-none" style={{ color: card.color }}>{compact(card.value)}</strong>
                            <p className="mt-2 text-xs text-[#8f816a]">{card.hint}</p>
                          </article>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 rounded-[30px] border border-[#eadfcd] bg-white/84 p-5 shadow-[0_14px_36px_rgba(79,58,22,0.06)]">
                      <div>
                        <p className={KICKER}>Top Spotlight</p>
                        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Best current momentum</h3>
                      </div>
                      {spotlight ? (
                        <>
                          <div className="flex items-start gap-4 rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4">
                            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[20px] bg-[#10111d] text-sm font-black text-white">{initials(spotlight.displayName)}</span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-lg font-semibold text-[#060710]">{spotlight.displayName}</p>
                                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${ROLE_TONE[spotlight.role] || "bg-[#f6efe2] text-[#5d503c]"}`}>{titleize(spotlight.role || "user")}</span>
                              </div>
                              <p className="mt-1 truncate text-sm text-[#8f816a]">{spotlight.email || "No email on file"}</p>
                              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                <div><p className={KICKER}>Won</p><strong className="mt-2 block text-xl font-black text-[#217346]">{compact(spotlight.wonLeads)}</strong></div>
                                <div><p className={KICKER}>Owned Leads</p><strong className="mt-2 block text-xl font-black text-[#060710]">{compact(spotlight.ownedLeads.length)}</strong></div>
                                <div><p className={KICKER}>Pending Tasks</p><strong className="mt-2 block text-xl font-black text-[#8d6e27]">{compact(spotlight.pendingTasks)}</strong></div>
                              </div>
                            </div>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Link prefetch={false} href="/leads" className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#d7b258] bg-[#f3dfab] px-4 py-2.5 text-sm font-semibold text-[#060710] shadow-[0_16px_30px_rgba(203,169,82,0.18)] transition hover:-translate-y-0.5 hover:bg-[#efd48f]">
                              <DashboardIcon name="leads" className="h-4 w-4" />
                              Open Leads
                            </Link>
                            <Link prefetch={false} href="/tasks" className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#eadfcd] bg-white px-4 py-2.5 text-sm font-semibold text-[#5d503c] transition hover:-translate-y-0.5 hover:text-[#060710]">
                              <DashboardIcon name="tasks" className="h-4 w-4" />
                              Open Tasks
                            </Link>
                          </div>
                        </>
                      ) : <div className="rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-12 text-center text-sm text-[#7a6b57]">No team member data available yet.</div>}
                    </div>
                  </div>
                </section>

                <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                  <section className={PANEL}>
                    <div className="mb-5">
                      <p className={KICKER}>Team Board</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Individual performance scan</h3>
                    </div>
                    <div className="space-y-3">
                      {teamBoard.length ? teamBoard.map((user) => (
                        <div key={user.user_id} className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                          <div className="flex items-start gap-3">
                            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#10111d] text-sm font-black text-white">{initials(user.displayName)}</span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-[#060710]">{user.displayName}</p>
                                  <p className="truncate text-xs text-[#8f816a]">{user.talent_id || "No talent ID"} | {user.phone || "No phone"}</p>
                                </div>
                                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${ROLE_TONE[user.role] || "bg-[#f6efe2] text-[#5d503c]"}`}>{titleize(user.role || "user")}</span>
                              </div>
                              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                                <div><p className={KICKER}>Owned Leads</p><strong className="mt-2 block text-lg font-black text-[#060710]">{compact(user.ownedLeads.length)}</strong></div>
                                <div><p className={KICKER}>Won</p><strong className="mt-2 block text-lg font-black text-[#217346]">{compact(user.wonLeads)}</strong></div>
                                <div><p className={KICKER}>Pending</p><strong className="mt-2 block text-lg font-black text-[#8d6e27]">{compact(user.pendingTasks)}</strong></div>
                                <div><p className={KICKER}>Overdue</p><strong className="mt-2 block text-lg font-black text-[#c56b1c]">{compact(user.overdueTasks)}</strong></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )) : <div className="rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-12 text-center text-sm text-[#7a6b57]">No performance roster available.</div>}
                    </div>
                  </section>

                  <section className={PANEL}>
                    <div className="mb-5">
                      <p className={KICKER}>Stage and Source Mix</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Where the team is spending pressure</h3>
                    </div>
                    <div className="space-y-3">
                      {stageMix.length ? stageMix.map((item) => (
                        <div key={item.status} className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                          <div className="flex items-center justify-between gap-3">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${STATUS_TONE[item.status] || "bg-[#f6efe2] text-[#5d503c] ring-[#eadfcd]"}`}>{titleize(item.status)}</span>
                            <strong className="text-lg font-black text-[#060710]">{compact(item.total)}</strong>
                          </div>
                        </div>
                      )) : <div className="rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-12 text-center text-sm text-[#7a6b57]">No stage mix available yet.</div>}
                      {sourceMix.length ? sourceMix.map((item) => (
                        <div key={item.lead_source || "unknown"} className="rounded-[24px] border border-[#eadfcd] bg-white/78 px-4 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[#060710]">{titleize(item.lead_source || "unknown")}</p>
                              <p className="mt-1 text-xs text-[#8f816a]">Source feeding current team pipeline</p>
                            </div>
                            <strong className="text-lg font-black text-[#8d6e27]">{compact(item.total)}</strong>
                          </div>
                        </div>
                      )) : <div className="rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-12 text-center text-sm text-[#7a6b57]">No source mix available yet.</div>}
                    </div>
                  </section>
                </div>

                <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
                  <section className={PANEL}>
                    <div className="mb-5">
                      <p className={KICKER}>Execution Pressure</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Task queue to review</h3>
                    </div>
                    <div className="space-y-3">
                      {visibleTasks.length ? visibleTasks.slice(0, 8).map((task) => (
                        <div key={task.task_id} className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#060710]">{task.title || "Untitled task"}</p>
                              <p className="mt-1 truncate text-xs text-[#8f816a]">{task.assigned_to_name || "Unassigned"} | {titleize(task.status || task.type || "task")}</p>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${pendingTask(task) ? "bg-[#fff4d9] text-[#8d6e27]" : "bg-[#ebf8ee] text-[#217346]"}`}>{when(task.due_date)}</span>
                          </div>
                        </div>
                      )) : <div className="rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-12 text-center text-sm text-[#7a6b57]">No task pressure available for the current team scope.</div>}
                    </div>
                  </section>

                  <section className={PANEL}>
                    <div className="mb-5">
                      <p className={KICKER}>Recent Lead Value</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Commercial weight in motion</h3>
                    </div>
                    <div className="space-y-3">
                      {visibleLeads.length ? visibleLeads.slice(0, 6).map((lead) => (
                        <Link prefetch={false} key={lead.lead_id} href={`/leads/${lead.lead_id}`} className="block rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4 transition hover:-translate-y-0.5 hover:border-[#d7b258] hover:bg-white">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#060710]">{lead.company_name || "Untitled lead"}</p>
                              <p className="mt-1 truncate text-xs text-[#8f816a]">{lead.assigned_to_name || "Unassigned"} | {titleize(lead.workflow_stage || "sales")}</p>
                            </div>
                            <strong className="text-lg font-black text-[#8d6e27]">{money(lead.estimated_value)}</strong>
                          </div>
                        </Link>
                      )) : <div className="rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-12 text-center text-sm text-[#7a6b57]">No lead value data available for the current team scope.</div>}
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
