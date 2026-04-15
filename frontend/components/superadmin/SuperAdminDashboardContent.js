"use client";

import Link from "next/link";

import {
  ActionLink,
  AvatarLabel,
  Badge,
  EmptyState,
  MetricCard,
  MetricGrid,
  Notice,
  Panel,
  PageIntro,
  SECONDARY_BUTTON_CLASS,
} from "./ui";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  isPastDate,
  titleize,
} from "./format";

function buildAlerts({ safety, pendingDemos, unassignedTotal, overdueTasks, staleFollowUps }) {
  const alerts = [];

  if (safety?.suspended_companies) {
    alerts.push({
      title: `${formatNumber(safety.suspended_companies)} suspended workspaces`,
      note: "Restore or review blocked tenants before they become admin escalations.",
      tone: "rose",
      href: "/super-admin/companies",
    });
  }

  if (safety?.inactive_admins) {
    alerts.push({
      title: `${formatNumber(safety.inactive_admins)} inactive tenant admins`,
      note: "Root operators can reactivate or replace the blocked admin owner.",
      tone: "amber",
      href: "/super-admin/security",
    });
  }

  if (unassignedTotal) {
    alerts.push({
      title: `${formatNumber(unassignedTotal)} unassigned leads`,
      note: "Ownership gaps are visible across workspaces so Super Admin can unblock teams fast.",
      tone: "blue",
      href: "/leads",
    });
  }

  if (overdueTasks) {
    alerts.push({
      title: `${formatNumber(overdueTasks)} overdue pending tasks`,
      note: "Task backlog is drifting beyond due date and may need platform intervention.",
      tone: "violet",
      href: "/tasks",
    });
  }

  if (pendingDemos) {
    alerts.push({
      title: `${formatNumber(pendingDemos)} demo requests still pending`,
      note: "Inbound demand is waiting on review from the platform desk.",
      tone: "emerald",
      href: "/super-admin/demo-requests",
    });
  }

  if (staleFollowUps) {
    alerts.push({
      title: `${formatNumber(staleFollowUps)} follow-ups already overdue`,
      note: "Pipeline hygiene is slipping and at-risk deals need reassignment.",
      tone: "amber",
      href: "/leads",
    });
  }

  return alerts.slice(0, 5);
}

export default function SuperAdminDashboardContent({ session, data, error, loading }) {
  const role = session?.user?.role || "";
  const summary = data.summary || {};
  const companies = data.companies?.items || [];
  const users = data.users?.items || [];
  const leads = data.leads?.items || [];
  const unassignedLeads = data.unassignedLeads?.items || [];
  const tasks = data.tasks?.items || [];
  const auditLogs = data.auditLogs?.items || [];
  const demoRequests = data.demoRequests?.items || [];
  const teamsTotal = data.teams?.meta?.total || 0;
  const customersTotal = data.customers?.meta?.total || 0;
  const pendingTaskTotal = data.tasks?.meta?.total || 0;
  const pendingDemoTotal = data.demoRequests?.meta?.total || 0;
  const unassignedTotal = data.unassignedLeads?.meta?.total || 0;
  const overdueTasks = tasks.filter((task) => task.status === "pending" && isPastDate(task.due_date)).length;
  const staleFollowUps = leads.filter((lead) => isPastDate(lead.follow_up_date)).length;
  const highPriorityLeads = leads.filter((lead) => String(lead.priority || "").toLowerCase() === "high");
  const alerts = buildAlerts({
    safety: data.safety,
    pendingDemos: pendingDemoTotal,
    unassignedTotal,
    overdueTasks,
    staleFollowUps,
  });
  const quickActions = [
    { href: "/super-admin/companies", icon: "company", label: "Tenant workspaces", description: "Review workspace status, access, SMTP, and seat governance." },
    { href: "/super-admin/users", icon: "users", label: "Platform users", description: "Create, recover, disable, or reset identities across the platform." },
    { href: "/super-admin/security", icon: "security", label: "Security desk", description: "Track seat guardrails, inactive admins, and suspended tenants." },
    { href: "/super-admin/settings", icon: "settings", label: "System defaults", description: "Set invite copy, login routing, and platform email defaults." },
  ];

  return (
    <>
      <Notice tone="error" text={error} className="mb-4" />
      {loading ? <Notice tone="info" text="Loading platform overview..." className="mb-4" /> : null}

      {!loading ? (
        <div className="space-y-6">
          <PageIntro
            eyebrow="Platform Control"
            title="Super Admin Console"
            description="One compact view for system health, ownership gaps, tenant risk, and rescue actions that admins or managers cannot finish on their own."
            meta={
              <>
                <Badge tone="violet">{titleize(role)} scope</Badge>
                <Badge tone="slate">{formatNumber(summary.companies || companies.length)} workspaces visible</Badge>
                {data.safety ? <Badge tone={data.safety.can_create_more ? "emerald" : "amber"}>{data.safety.can_create_more ? "Seat capacity healthy" : "Seat capacity near limit"}</Badge> : null}
              </>
            }
            actions={
              <>
                <Link href="/super-admin/users" className={SECONDARY_BUTTON_CLASS}>
                  Open Access Desk
                </Link>
                <Link href="/super-admin/companies" className={SECONDARY_BUTTON_CLASS}>
                  Open Tenant Directory
                </Link>
              </>
            }
          />

          <MetricGrid className="2xl:grid-cols-3">
            <MetricCard icon="company" label="Companies" value={formatNumber(summary.companies || companies.length)} note="Live tenant workspaces currently visible to this platform seat." tone="emerald" />
            <MetricCard icon="users" label="Users" value={formatNumber(summary.users || users.length)} note="Global identities across assigned workspaces and platform operators." tone="blue" />
            <MetricCard icon="leads" label="Leads" value={formatNumber(summary.leads || 0)} note={`${formatNumber(unassignedTotal)} still need owner assignment.`} tone="amber" />
            <MetricCard icon="customers" label="Customers" value={formatNumber(customersTotal)} note="Customer records visible from the platform oversight layer." tone="slate" />
            <MetricCard icon="tasks" label="Pending Tasks" value={formatNumber(pendingTaskTotal)} note={`${formatNumber(overdueTasks)} already overdue and may need escalation.`} tone="rose" />
            <MetricCard icon="products" label="Products & Teams" value={`${formatNumber(summary.products || 0)} / ${formatNumber(teamsTotal)}`} note="Active product catalog entries and team containers across the system." tone="violet" />
          </MetricGrid>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Panel
              eyebrow="Intervention Queue"
              title="What needs root attention right now"
              description="The highest-signal blockers that Super Admin can resolve faster than tenant-level operators."
              action={<Badge tone="slate">{alerts.length || 0} priority items</Badge>}
            >
              {alerts.length ? (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <Link
                      key={`${alert.title}-${alert.href}`}
                      href={alert.href}
                      className="flex flex-col gap-3 rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 transition hover:border-slate-300 hover:bg-white md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-sm text-slate-900">{alert.title}</strong>
                          <Badge tone={alert.tone}>{titleize(alert.tone)}</Badge>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{alert.note}</p>
                      </div>
                      <span className="text-sm font-semibold text-slate-700">Review</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon="security"
                  title="No active intervention queue"
                  description="Suspensions, inactive admins, unassigned records, and overdue work are all under control right now."
                />
              )}
            </Panel>

            <Panel
              eyebrow="Fast Paths"
              title="Jump straight into platform work"
              description="Shortcuts for rescue workflows, operations cleanup, and global controls."
            >
              <div className="grid gap-3 md:grid-cols-2">
                {quickActions.map((item) => (
                  <ActionLink key={item.href} {...item} />
                ))}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Pending Demos</span>
                  <strong className="mt-2 block text-2xl font-black text-slate-900">{formatNumber(pendingDemoTotal)}</strong>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Inbound requests still waiting on review or qualification.</p>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Priority Leads</span>
                  <strong className="mt-2 block text-2xl font-black text-slate-900">{formatNumber(highPriorityLeads.length)}</strong>
                  <p className="mt-2 text-sm leading-6 text-slate-500">High-priority pipeline items from the latest activity sample.</p>
                </div>
              </div>
            </Panel>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel
              eyebrow="Tenant Watch"
              title="Recent workspace movement"
              description="New tenants and current workspace states visible from the platform directory."
              action={<Link href="/super-admin/companies" className={SECONDARY_BUTTON_CLASS}>View all workspaces</Link>}
            >
              {companies.length ? (
                <div className="space-y-3">
                  {companies.map((company) => (
                    <div key={company.company_id} className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <AvatarLabel label={company.name} sublabel={`${company.slug || company.company_id} | Created ${formatDate(company.created_at)}`} tone="emerald" />
                        <div className="flex flex-wrap gap-2">
                          <Badge tone={company.status === "active" ? "emerald" : company.status === "suspended" ? "rose" : "amber"}>{titleize(company.status || "trial")}</Badge>
                          <Badge tone="slate">{company.settings_timezone || "Default timezone"}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon="company" title="No workspaces loaded" description="Company results will appear here once tenants exist or match this platform seat." />
              )}
            </Panel>

            <Panel
              eyebrow="Ownership Watch"
              title="Unassigned and stale record watch"
              description="Cross-team records that need ownership cleanup, follow-up rescue, or direct reassignment."
              action={<Link href="/leads" className={SECONDARY_BUTTON_CLASS}>Open leads</Link>}
            >
              {unassignedLeads.length || staleFollowUps ? (
                <div className="space-y-3">
                  {[...unassignedLeads, ...leads.filter((lead) => isPastDate(lead.follow_up_date)).slice(0, 3)].slice(0, 6).map((lead) => (
                    <Link key={`${lead.lead_id}-${lead.company_id || ""}`} href={`/leads/${lead.lead_id}`} className="block rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 transition hover:border-slate-300 hover:bg-white">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <strong className="block truncate text-sm text-slate-900">{lead.company_name || lead.contact_person || "Untitled lead"}</strong>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {lead.contact_person || "No contact"} | {lead.team_name || "No team"} | {lead.assigned_to_name || "No owner"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge tone={lead.assigned_to_name ? "amber" : "rose"}>{lead.assigned_to_name ? "Follow-up stale" : "Unassigned"}</Badge>
                          <Badge tone="slate">{titleize(lead.workflow_stage || "sales")}</Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState icon="leads" title="Ownership looks healthy" description="No unassigned or obviously stale records were found in the current platform sample." />
              )}
            </Panel>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel
              eyebrow="Priority Pipeline"
              title="Recent lead activity"
              description="High-signal pipeline activity with value, follow-up timing, and workflow stage."
              action={<Link href="/leads" className={SECONDARY_BUTTON_CLASS}>Open full pipeline</Link>}
            >
              {leads.length ? (
                <div className="space-y-3">
                  {leads.slice(0, 6).map((lead) => (
                    <Link key={lead.lead_id} href={`/leads/${lead.lead_id}`} className="block rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 transition hover:border-slate-300 hover:bg-white">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <strong className="block truncate text-sm text-slate-900">{lead.company_name || "Untitled lead"}</strong>
                          <p className="mt-1 truncate text-xs text-slate-500">{lead.contact_person || "No contact"} | {lead.assigned_to_name || "Unassigned"} | {lead.team_name || "No team"}</p>
                          <p className="mt-2 text-sm text-slate-600">
                            {formatCurrency(lead.estimated_value || 0)} | Follow-up {formatDateTime(lead.follow_up_date)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge tone={String(lead.priority || "").toLowerCase() === "high" ? "rose" : "amber"}>{titleize(lead.priority || "medium")}</Badge>
                          <Badge tone="blue">{titleize(lead.workflow_stage || "sales")}</Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState icon="leads" title="No recent lead activity" description="Lead cards will appear here once platform-visible pipeline data is available." />
              )}
            </Panel>

            <Panel
              eyebrow={role === "super-admin" ? "Audit Tail" : "Recent Users"}
              title={role === "super-admin" ? "Latest platform activity" : "Recently created platform-visible users"}
              description={role === "super-admin" ? "Recent control-room actions and recovery operations across the platform." : "Fresh identities and their current access state across visible companies."}
              action={
                <Link href={role === "super-admin" ? "/super-admin/audit-logs" : "/super-admin/users"} className={SECONDARY_BUTTON_CLASS}>
                  {role === "super-admin" ? "Open audit logs" : "Open users"}
                </Link>
              }
            >
              {role === "super-admin" && auditLogs.length ? (
                <div className="space-y-3">
                  {auditLogs.slice(0, 6).map((log) => (
                    <div key={log.audit_id} className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <strong className="block truncate text-sm text-slate-900">{titleize(log.action || "activity")}</strong>
                          <p className="mt-1 truncate text-xs text-slate-500">{log.user_email || "System"} | {log.user_role || "platform"} | {formatDateTime(log.logged_at)}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge tone={log.company_id ? "blue" : "violet"}>{log.company_id || "Platform"}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : users.length ? (
                <div className="space-y-3">
                  {users.slice(0, 6).map((user) => (
                    <div key={user.user_id} className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <AvatarLabel label={user.name || user.user_id} sublabel={`${user.email || "No email"} | ${user.company_name || "Platform"}`} tone="blue" />
                        <div className="flex flex-wrap gap-2">
                          <Badge tone="slate">{titleize(user.role || "user")}</Badge>
                          <Badge tone={user.is_active ? "emerald" : "rose"}>{user.is_active ? "Active" : "Inactive"}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon="users" title="No recent activity loaded" description="Either audit data is unavailable for this role or there are no recent users in the current sample." />
              )}
            </Panel>
          </div>

          {role === "super-admin" ? (
            <Panel
              eyebrow="Demand Queue"
              title="Latest demo requests"
              description="Inbound platform demand is visible here so Super Admin can step in before a request stalls."
              action={<Link href="/super-admin/demo-requests" className={SECONDARY_BUTTON_CLASS}>Open demo queue</Link>}
            >
              {demoRequests.length ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {demoRequests.slice(0, 4).map((request) => (
                    <div key={request.id} className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm text-slate-900">{request.name}</strong>
                        <Badge tone={request.status === "pending" ? "amber" : "emerald"}>{titleize(request.status || "pending")}</Badge>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{request.company || "No company"} | {request.email}</p>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{request.message || "No additional request note provided."}</p>
                      <p className="mt-3 text-xs text-slate-500">Requested {formatDateTime(request.created_at)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon="demo" title="No pending demo demand" description="Fresh demo requests will land here when the inbound queue has activity." />
              )}
            </Panel>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
