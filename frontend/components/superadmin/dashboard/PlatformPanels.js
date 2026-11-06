"use client";

import Link from "next/link";
import { COLORS, HEALTH, MODULE_LABELS, Panel, P, ago, num, pct, titleize } from "./platform-ui";

/** How many tenants are active, quiet, new, at risk or suspended, as one bar and a legend. */
export function HealthPanel({ health = [], total }) {
  return (
    <Panel title="Company health" subtitle="Based on sign-ins and new leads">
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-slate-100">
        {health.filter((h) => h.value).map((h) => (
          <span key={h.key} title={`${HEALTH[h.key].label}: ${h.value}`} style={{ width: `${pct(h.value, total)}%`, background: HEALTH[h.key].bar }} />
        ))}
      </div>
      <ul className="mt-3 space-y-2">
        {health.map((h) => (
          <li key={h.key} className="flex items-center gap-2.5 text-[12.5px]">
            <i className={`h-2.5 w-2.5 shrink-0 rounded-full ${HEALTH[h.key].dot}`} />
            <span className="min-w-0 flex-1"><span className="font-semibold text-slate-800">{HEALTH[h.key].label}</span><span className="block truncate text-[11px] text-slate-400">{HEALTH[h.key].text}</span></span>
            <span className="tabular-nums text-slate-400">{pct(h.value, total)}%</span>
            <b className="w-8 text-right tabular-nums text-slate-900">{num(h.value)}</b>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** Things worth a look today, most serious first. */
export function AttentionPanel({ data }) {
  const t = data.totals || {};
  const health = Object.fromEntries((data.health || []).map((h) => [h.key, h.value]));
  const items = [
    health.at_risk && { tone: "bg-rose-500", title: `${num(health.at_risk)} companies at risk`, text: "Nobody signed in for 2 weeks. Call their admin.", href: "/super-admin/companies" },
    t.companies_suspended && { tone: "bg-slate-400", title: `${num(t.companies_suspended)} suspended`, text: "Switched off. Check if payment or renewal is pending.", href: "/super-admin/companies" },
    t.leads_unassigned && { tone: "bg-amber-500", title: `${num(t.leads_unassigned)} leads without an owner`, text: "Across all companies.", href: "/leads" },
    t.tasks_overdue && { tone: "bg-amber-500", title: `${num(t.tasks_overdue)} overdue tasks`, text: `${num(t.tasks_pending)} tasks open in total.`, href: "/tasks" },
    t.users_verified !== null && t.users_active > t.users_verified && { tone: "bg-blue-500", title: `${num(t.users_active - t.users_verified)} people not verified`, text: "They get no reminder emails until they enter the login code.", href: "/super-admin/users" },
    data.developer?.failed_7d && { tone: "bg-rose-500", title: `${num(data.developer.failed_7d)} failed API or lead-link calls`, text: "In the last 7 days.", href: "/super-admin/companies" },
    t.demos_pending && { tone: "bg-emerald-500", title: `${num(t.demos_pending)} demo requests waiting`, text: "New companies asking to see GreenCRM.", href: "/super-admin/demo-requests" },
  ].filter(Boolean);
  return (
    <Panel title="Needs attention" subtitle={items.length ? `${items.length} thing${items.length === 1 ? "" : "s"} to look at` : "All clear"}>
      {items.length ? (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.title}>
              <Link href={item.href} className="flex items-start gap-2.5 rounded-[10px] px-2.5 py-2 transition hover:bg-slate-50">
                <i className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.tone}`} />
                <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold text-slate-800">{item.title}</span><span className="block text-[11.5px] text-slate-500">{item.text}</span></span>
                <span className="text-slate-300">→</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : <p className="py-6 text-center text-[13px] text-slate-500">Nothing needs action right now.</p>}
    </Panel>
  );
}

/** Which modules companies have switched on. */
export function AdoptionPanel({ adoption = [], total }) {
  return (
    <Panel title="Module use" subtitle={`Out of ${num(total)} companies`} action={<Link href="/super-admin/companies" className={P.small}>Manage</Link>}>
      <ul className="space-y-2">
        {adoption.map((m) => (
          <li key={m.key} className="text-[12.5px]">
            <div className="flex items-center justify-between gap-2"><span className="truncate font-medium text-slate-700">{MODULE_LABELS[m.key] || titleize(m.key)}</span><span className="tabular-nums text-slate-500"><b className="text-slate-900">{m.on}</b> · {m.share}%</span></div>
            <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full" style={{ width: `${m.share}%`, background: m.key === "developer_api" ? COLORS[4] : COLORS[0] }} /></span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Bars({ items, color }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const total = items.reduce((s, i) => s + i.value, 0);
  if (!items.length) return <p className="py-4 text-center text-[12.5px] text-slate-400">Nothing yet.</p>;
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.key} className="grid grid-cols-[minmax(0,110px)_minmax(0,1fr)_auto] items-center gap-2 text-[12.5px]">
          <span className="truncate font-medium text-slate-700">{titleize(i.label)}</span>
          <span className="h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full" style={{ width: `${(i.value / max) * 100}%`, background: color }} /></span>
          <span className="w-16 text-right tabular-nums text-slate-500"><b className="text-slate-900">{num(i.value)}</b> {pct(i.value, total)}%</span>
        </li>
      ))}
    </ul>
  );
}

export function MixPanel({ roles = [], sources = [], days }) {
  return (
    <Panel title="People and lead sources">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">People by role</p>
      <div className="mt-2"><Bars items={roles} color={COLORS[1]} /></div>
      <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Lead sources · last {days} days</p>
      <div className="mt-2"><Bars items={sources} color={COLORS[0]} /></div>
    </Panel>
  );
}

export function ActivityPanels({ demos = [], audit = [] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel title="Demo requests" subtitle="Waiting for a reply" action={<Link href="/super-admin/demo-requests" className={P.small}>All</Link>}>
        {demos.length ? (
          <ul className="divide-y divide-slate-100">
            {demos.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0"><span className="block truncate text-[13px] font-semibold text-slate-800">{d.name}{d.company ? ` · ${d.company}` : ""}</span><span className="block truncate text-[11.5px] text-slate-500">{d.email}</span></span>
                <span className="shrink-0 text-[11.5px] text-slate-400">{ago(d.created_at)}</span>
              </li>
            ))}
          </ul>
        ) : <p className="py-6 text-center text-[13px] text-slate-500">No demo requests waiting.</p>}
      </Panel>
      <Panel title="Recent platform activity" action={<Link href="/super-admin/audit-logs" className={P.small}>Audit log</Link>}>
        {audit.length ? (
          <ul className="divide-y divide-slate-100">
            {audit.map((a) => (
              <li key={a.audit_id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0"><span className="block truncate text-[13px] font-semibold text-slate-800">{titleize(String(a.action || "activity").replace(/\./g, " "))}</span><span className="block truncate text-[11.5px] text-slate-500">{a.user_email || "System"}{a.company_id ? ` · ${a.company_id}` : ""}</span></span>
                <span className="shrink-0 text-[11.5px] text-slate-400">{ago(a.logged_at)}</span>
              </li>
            ))}
          </ul>
        ) : <p className="py-6 text-center text-[13px] text-slate-500">No activity yet.</p>}
      </Panel>
    </div>
  );
}
