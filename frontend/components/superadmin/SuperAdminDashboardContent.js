"use client";

import Link from "next/link";
import { ActionLink, AvatarLabel, Badge, EmptyState, MetricCard, MetricGrid, Notice, Panel, PageIntro, SECONDARY_BUTTON_CLASS } from "./ui";
import { formatCurrency, formatDate, formatDateTime, formatNumber, isPastDate, titleize } from "./format";

function buildAlerts({ safety, pendingDemos, unassignedTotal, overdueTasks, staleFollowUps }) {
  const a = [];
  if (safety?.suspended_companies) a.push({ title: `${formatNumber(safety.suspended_companies)} suspended workspaces`, tone: "rose", href: "/super-admin/companies" });
  if (safety?.inactive_admins) a.push({ title: `${formatNumber(safety.inactive_admins)} inactive admins`, tone: "amber", href: "/super-admin/security" });
  if (unassignedTotal) a.push({ title: `${formatNumber(unassignedTotal)} unassigned leads`, tone: "blue", href: "/leads" });
  if (overdueTasks) a.push({ title: `${formatNumber(overdueTasks)} overdue tasks`, tone: "violet", href: "/tasks" });
  if (pendingDemos) a.push({ title: `${formatNumber(pendingDemos)} pending demos`, tone: "emerald", href: "/super-admin/demo-requests" });
  if (staleFollowUps) a.push({ title: `${formatNumber(staleFollowUps)} stale follow-ups`, tone: "amber", href: "/leads" });
  return a.slice(0, 5);
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
  const overdueTasks = tasks.filter(t => t.status === "pending" && isPastDate(t.due_date)).length;
  const staleFollowUps = leads.filter(l => isPastDate(l.follow_up_date)).length;
  const alerts = buildAlerts({ safety: data.safety, pendingDemos: pendingDemoTotal, unassignedTotal, overdueTasks, staleFollowUps });

  if (loading) return <Notice tone="info" text="Loading…" />;

  return (
    <div className="space-y-5">
      <Notice tone="error" text={error} />

      <PageIntro
        eyebrow="Platform Control"
        title="Super Admin Console"
        meta={<><Badge tone="violet">{titleize(role)}</Badge><Badge>{formatNumber(summary.companies || companies.length)} workspaces</Badge>{data.safety ? <Badge tone={data.safety.can_create_more ? "emerald" : "amber"}>{data.safety.can_create_more ? "Healthy" : "Near limit"}</Badge> : null}</>}
        actions={<><Link href="/super-admin/users" className={SECONDARY_BUTTON_CLASS}>Users</Link><Link href="/super-admin/companies" className={SECONDARY_BUTTON_CLASS}>Tenants</Link></>}
      />

      <MetricGrid>
        <MetricCard icon="company" label="Companies" value={formatNumber(summary.companies || companies.length)} note={`${formatNumber(companies.filter(c=>c.status==="active").length)} active`} tone="emerald" />
        <MetricCard icon="users" label="Users" value={formatNumber(summary.users || users.length)} tone="blue" />
        <MetricCard icon="leads" label="Leads" value={formatNumber(summary.leads || 0)} note={unassignedTotal ? `${formatNumber(unassignedTotal)} unassigned` : null} tone="amber" />
        <MetricCard icon="customers" label="Customers" value={formatNumber(customersTotal)} tone="slate" />
        <MetricCard icon="tasks" label="Tasks" value={formatNumber(pendingTaskTotal)} note={overdueTasks ? `${formatNumber(overdueTasks)} overdue` : null} tone="rose" />
        <MetricCard icon="products" label="Products / Teams" value={`${formatNumber(summary.products || 0)} / ${formatNumber(teamsTotal)}`} tone="violet" />
      </MetricGrid>

      {/* Alerts + Quick Actions */}
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel eyebrow="Attention" title={`${alerts.length} items need action`}>
          {alerts.length ? (
            <div className="space-y-2">
              {alerts.map(a => (
                <Link key={a.title} href={a.href} className="flex items-center justify-between rounded-lg border border-slate-100 px-3.5 py-2.5 transition hover:bg-slate-50">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2 w-2 rounded-full ${a.tone === "rose" ? "bg-rose-500" : a.tone === "amber" ? "bg-amber-500" : a.tone === "violet" ? "bg-violet-500" : a.tone === "emerald" ? "bg-emerald-500" : "bg-blue-500"}`} />
                    <span className="text-sm font-medium text-slate-800">{a.title}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">→</span>
                </Link>
              ))}
            </div>
          ) : <p className="text-sm text-slate-400">All clear — nothing needs attention.</p>}
        </Panel>

        <Panel eyebrow="Quick Access">
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { href: "/super-admin/companies", icon: "company", label: "Workspaces", description: "Tenant status & access" },
              { href: "/super-admin/users", icon: "users", label: "Users", description: "Identities & roles" },
              { href: "/super-admin/security", icon: "security", label: "Security", description: "Guardrails & audit" },
              { href: "/super-admin/settings", icon: "settings", label: "Settings", description: "Platform defaults" },
            ].map(item => <ActionLink key={item.href} {...item} />)}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-slate-50 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Demos</p>
              <p className="mt-0.5 text-lg font-bold text-slate-900">{formatNumber(pendingDemoTotal)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">High Priority</p>
              <p className="mt-0.5 text-lg font-bold text-slate-900">{formatNumber(leads.filter(l => String(l.priority||"").toLowerCase() === "high").length)}</p>
            </div>
          </div>
        </Panel>
      </div>

      {/* Tenants + Ownership */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel eyebrow="Tenants" title="Workspaces" action={<Link href="/super-admin/companies" className={SECONDARY_BUTTON_CLASS}>All</Link>}>
          {companies.length ? (
            <div className="space-y-1.5">
              {companies.map(c => (
                <div key={c.company_id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50 transition">
                  <AvatarLabel label={c.name} sublabel={`${c.slug || "—"} · ${formatDate(c.created_at)}`} tone="emerald" />
                  <Badge tone={c.status === "active" ? "emerald" : c.status === "suspended" ? "rose" : "amber"}>{titleize(c.status || "trial")}</Badge>
                </div>
              ))}
            </div>
          ) : <EmptyState icon="company" title="No workspaces" description="Tenants will appear here." />}
        </Panel>

        <Panel eyebrow="Ownership" title="Needs attention" action={<Link href="/leads" className={SECONDARY_BUTTON_CLASS}>Leads</Link>}>
          {unassignedLeads.length || staleFollowUps ? (
            <div className="space-y-1.5">
              {[...unassignedLeads, ...leads.filter(l => isPastDate(l.follow_up_date)).slice(0, 3)].slice(0, 6).map(l => (
                <Link key={`${l.lead_id}-${l.company_id||""}`} href={`/leads/${l.lead_id}`} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50 transition">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{l.company_name || l.contact_person || "Untitled"}</p>
                    <p className="truncate text-[11px] text-slate-400">{l.contact_person || "—"} · {l.assigned_to_name || "No owner"}</p>
                  </div>
                  <Badge tone={l.assigned_to_name ? "amber" : "rose"}>{l.assigned_to_name ? "Stale" : "Unassigned"}</Badge>
                </Link>
              ))}
            </div>
          ) : <EmptyState icon="leads" title="All healthy" description="No ownership gaps found." />}
        </Panel>
      </div>

      {/* Pipeline + Audit */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel eyebrow="Pipeline" title="Recent leads" action={<Link href="/leads" className={SECONDARY_BUTTON_CLASS}>All</Link>}>
          {leads.length ? (
            <div className="space-y-1.5">
              {leads.slice(0, 6).map(l => (
                <Link key={l.lead_id} href={`/leads/${l.lead_id}`} className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-slate-50 transition">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{l.company_name || "Untitled"}</p>
                    <p className="truncate text-[11px] text-slate-400">{l.contact_person || "—"} · {formatCurrency(l.estimated_value || 0)} · {l.follow_up_date ? formatDateTime(l.follow_up_date) : "No follow-up"}</p>
                  </div>
                  <div className="flex shrink-0 gap-1.5 ml-3">
                    <Badge tone={String(l.priority||"").toLowerCase() === "high" ? "rose" : "amber"}>{titleize(l.priority || "med")}</Badge>
                    <Badge tone="blue">{titleize(l.workflow_stage || "sales")}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : <EmptyState icon="leads" title="No leads" description="Pipeline data will appear here." />}
        </Panel>

        <Panel eyebrow={role === "super-admin" ? "Audit" : "Users"} title={role === "super-admin" ? "Recent activity" : "Recent users"} action={<Link href={role === "super-admin" ? "/super-admin/audit-logs" : "/super-admin/users"} className={SECONDARY_BUTTON_CLASS}>All</Link>}>
          {role === "super-admin" && auditLogs.length ? (
            <div className="space-y-1.5">
              {auditLogs.slice(0, 6).map(log => (
                <div key={log.audit_id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50 transition">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{titleize(log.action || "activity")}</p>
                    <p className="truncate text-[11px] text-slate-400">{log.user_email || "System"} · {formatDateTime(log.logged_at)}</p>
                  </div>
                  <Badge tone={log.company_id ? "blue" : "violet"}>{log.company_id || "Platform"}</Badge>
                </div>
              ))}
            </div>
          ) : users.length ? (
            <div className="space-y-1.5">
              {users.slice(0, 6).map(u => (
                <div key={u.user_id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50 transition">
                  <AvatarLabel label={u.name || "Unknown"} sublabel={u.email || "No email"} tone="blue" />
                  <div className="flex gap-1.5"><Badge>{titleize(u.role || "user")}</Badge><Badge tone={u.is_active ? "emerald" : "rose"}>{u.is_active ? "Active" : "Off"}</Badge></div>
                </div>
              ))}
            </div>
          ) : <EmptyState icon="users" title="No data" description="Activity will appear here." />}
        </Panel>
      </div>

      {/* Demos */}
      {role === "super-admin" && demoRequests.length ? (
        <Panel eyebrow="Demos" title="Pending requests" action={<Link href="/super-admin/demo-requests" className={SECONDARY_BUTTON_CLASS}>All</Link>}>
          <div className="grid gap-2 lg:grid-cols-2">
            {demoRequests.slice(0, 4).map(r => (
              <div key={r.id} className="rounded-lg border border-slate-100 px-3.5 py-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800">{r.name}</p>
                  <Badge tone="amber">{titleize(r.status || "pending")}</Badge>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">{r.company || "—"} · {r.email}</p>
                <p className="mt-2 text-xs text-slate-600 line-clamp-2">{r.message || "No note."}</p>
                <p className="mt-2 text-[11px] text-slate-400">{formatDateTime(r.created_at)}</p>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
