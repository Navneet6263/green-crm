"use client";

import Link from "next/link";
import { LEAD_STATUS_ORDER, getLeadStatusLabel } from "../../../lib/leadStatus";
import { BarList, ColumnChart, MoreLink, WidgetFrame } from "./charts";
import { SourceMark, brandFor } from "./sourceBrands";
import { PALETTE, count, fmtDay, fmtMonth, money, pct, periodLink } from "./widgetCatalog";

const leadsHref = (params) => `/leads?${new URLSearchParams(params)}`;
const [TEAL, BLUE, PINK, GOLD, VIOLET, ORANGE] = PALETTE;
const ROSE = "#e11d48";
const GREEN = "#059669";

const ICONS = {
  leads: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.8-3 2.8-4.5 5.5-4.5s4.7 1.5 5.5 4.5M16 6.5a2.6 2.6 0 0 1 0 5M17.5 14.8c1.6.5 2.6 1.9 3 4.2" /></>,
  won: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7" /></>,
  pipeline: <><path d="M4 5h16l-6 7v6l-4 2v-8L4 5Z" /></>,
  overdue: <><circle cx="12" cy="13" r="7" /><path d="M12 9.5V13l2.5 1.5M9 3h6" /></>,
  today: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 9.5h16M8 3v4M16 3v4" /></>,
  tasks: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="m3.5 6 1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2" /></>,
  notes: <><path d="M5 4h10l4 4v12H5V4Z" /><path d="M14 4v5h5M8.5 13h7M8.5 16.5h5" /></>,
  lost: <><circle cx="12" cy="12" r="8" /><path d="m9 9 6 6M15 9l-6 6" /></>,
  money: <><path d="M7 5h10M7 9h10M11 5c3 0 4.5 1.6 4.5 4S14 13 11 13H8l7 6" /></>,
};

function Tile({ label, value, hint, color, icon, alert, href }) {
  const body = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-semibold text-slate-500">{label}</span>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px]" style={{ background: `${color}1f`, color }} aria-hidden="true">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{ICONS[icon]}</svg>
        </span>
      </span>
      <span className={`mt-1 block text-[24px] font-bold leading-none tracking-tight tabular-nums ${alert ? "text-rose-700" : "text-slate-900"}`}>{value}</span>
      {hint ? <span className="mt-1.5 block truncate text-[11.5px] text-slate-500">{hint}</span> : null}
      <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full" style={{ background: color }} aria-hidden="true" />
    </>
  );
  const cls = "relative block overflow-hidden rounded-[12px] bg-white p-3.5 ring-1 ring-slate-200 transition";
  return href ? <Link href={href} prefetch={false} className={`${cls} hover:-translate-y-px hover:shadow-sm`}>{body}</Link> : <div className={cls}>{body}</div>;
}

export function KpiWidget({ state, range, canTeam, showMoney }) {
  const k = state?.data;
  if (state?.error) return <WidgetFrame title="Key numbers" error={state.error} />;
  if (!k) return <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-[96px] animate-pulse rounded-[12px] bg-white ring-1 ring-slate-200" />)}</div>;
  const period = periodLink(range);
  const total = Number(k.now.total ?? k.cohort.added);
  const tiles = [
    { label: "Total leads", icon: "leads", color: BLUE, value: count(total), href: "/leads",
      hint: range.all ? `${count(k.now.open_leads)} open · ${count(k.cohort.won)} won` : `+${count(k.cohort.added)} added ${fmtDay(range.from)} – ${fmtDay(range.to)}` },
    { label: "Won", icon: "won", color: GREEN, value: count(k.cohort.won), hint: `${pct(k.cohort.won, k.cohort.added)} of ${range.all ? "all leads" : "leads added"}`, href: leadsHref({ ...period, status: "closed-won" }) },
    { label: "Open pipeline", icon: "pipeline", color: TEAL, value: money(k.now.pipeline_value), hint: `${count(k.now.open_leads)} open leads now`, href: leadsHref({ status: "active" }) },
    { label: "Follow-ups overdue", icon: "overdue", color: ROSE, alert: k.now.overdue > 0, value: count(k.now.overdue), hint: "Past their date", href: leadsHref({ follow_up: "overdue" }) },
    { label: "Follow-ups today", icon: "today", color: ORANGE, value: count(k.now.today), hint: "Due today", href: leadsHref({ follow_up: "today" }) },
    { label: "Tasks overdue", icon: "tasks", color: PINK, alert: k.tasks.overdue > 0, value: count(k.tasks.overdue), hint: `${count(k.tasks.today)} due today`, href: "/calendar" },
    { label: canTeam ? "Updates written" : "My updates", icon: "notes", color: VIOLET, value: count(k.updates), hint: range.all ? "Notes so far" : "Notes in the period", href: "/recent-updates" },
    showMoney
      ? { label: "Advance received", icon: "money", color: GOLD, value: money(k.now.advance_received), hint: `${money(k.now.pending_amount)} still pending` }
      : { label: "Lost", icon: "lost", color: GOLD, value: count(k.cohort.lost), hint: range.all ? "All lost leads" : "Of leads added" },
  ];
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">{tiles.map((t) => <Tile key={t.label} {...t} />)}</div>;
}

export function SourcesWidget({ state, range }) {
  const rows = state?.data || [];
  const total = rows.reduce((s, r) => s + r.total, 0);
  const items = rows.slice(0, 8).map((r) => {
    const brand = brandFor(r.name);
    return { key: r.name, label: brand.label, color: brand.color, icon: <SourceMark name={r.name} />, value: r.total, part: r.won, won: r.won };
  });
  return (
    <WidgetFrame title="Lead sources" accent={BLUE} loading={!state} error={state?.error} action={<MoreLink href="/leads">Leads</MoreLink>}
      subtitle={`Where ${range.all ? "all" : "the"} ${count(total)} leads came from · solid part = won`}>
      {items.length ? (
        <div className="mb-3 flex h-2.5 overflow-hidden rounded-full" aria-hidden="true">
          {items.map((i) => <span key={i.key} className="h-full border-r-2 border-white last:border-0" style={{ width: `${(i.value / Math.max(1, total)) * 100}%`, background: i.color }} />)}
        </div>
      ) : null}
      <BarList items={items} extra={(i) => `${count(i.won)} won · ${pct(i.won, i.value)}`}
        hrefFor={(i) => leadsHref({ lead_source: i.key, ...periodLink(range) })} />
      {rows.length > 8 ? <p className="mt-2 text-[12px] text-slate-500">+{rows.length - 8} more sources in the Excel report</p> : null}
    </WidgetFrame>
  );
}

export function TrendWidget({ state }) {
  const days = state?.data || [];
  const monthly = Boolean(days[0]?.month);
  const weekly = !monthly && days.length > 45;
  const points = [];
  if (weekly) {
    for (let i = 0; i < days.length; i += 7) {
      const week = days.slice(i, i + 7);
      points.push({ key: week[0].day, label: `Week of ${fmtDay(week[0].day)}`, value: week.reduce((s, d) => s + d.total, 0), part: week.reduce((s, d) => s + d.won, 0) });
    }
  } else days.forEach((d) => points.push({ key: d.day, label: monthly ? fmtMonth(d.month) : fmtDay(d.day), value: d.total, part: d.won }));
  const total = days.reduce((s, d) => s + d.total, 0);
  return (
    <WidgetFrame title="Leads over time" accent={TEAL} subtitle={`${count(total)} added · ${monthly ? "per month" : weekly ? "per week" : "per day"}`} loading={!state} error={state?.error}>
      <ColumnChart points={points} color={TEAL} />
    </WidgetFrame>
  );
}

// Won and lost wear their status colours; every open stage shares one blue.
const statusColor = (name) => (name === "closed-won" ? GREEN : name === "closed-lost" ? ROSE : BLUE);

export function FunnelWidget({ state, range }) {
  const rows = state?.data || [];
  const order = (name) => { const i = LEAD_STATUS_ORDER.indexOf(name); return i < 0 ? 99 : i; };
  const sorted = [...rows].sort((a, b) => order(a.name) - order(b.name));
  const total = rows.reduce((s, r) => s + r.total, 0);
  return (
    <WidgetFrame title={range.all ? "Leads by status" : "Status of new leads"} accent={BLUE} loading={!state} error={state?.error}
      subtitle={range.all ? `Where all ${count(total)} leads stand now` : `Where the ${count(total)} leads added stand now`}>
      <BarList items={sorted.map((r) => ({ key: r.name, label: getLeadStatusLabel(r.name), value: r.total, color: statusColor(r.name), solid: true }))} extra={(i) => pct(i.value, total)}
        hrefFor={(i) => leadsHref({ status: i.key, ...periodLink(range) })} />
      <div className="mt-3 flex flex-wrap gap-4 text-[12px] text-slate-600">
        {[[BLUE, "Open"], [GREEN, "Won"], [ROSE, "Lost"]].map(([c, name]) => <span key={name} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: c }} />{name}</span>)}
      </div>
    </WidgetFrame>
  );
}

export function ProductsWidget({ state }) {
  const rows = state?.data || [];
  return (
    <WidgetFrame title="Products" accent={VIOLET} subtitle="Leads per product · solid part = won" loading={!state} error={state?.error}>
      <BarList color={VIOLET} items={rows.slice(0, 8).map((r) => ({ key: r.name, label: r.name, value: r.total, part: r.won, won: r.won, money: r.value }))}
        extra={(i) => `${count(i.won)} won · ${money(i.money)}`} />
    </WidgetFrame>
  );
}

export function PaymentsWidget({ state }) {
  const p = state?.data;
  const figures = p ? [["Received so far", money(p.advance), GREEN], ["Still pending", money(p.pending), ORANGE], ["Paid in this period", money(p.receivedInPeriod), BLUE]] : [];
  return (
    <WidgetFrame title="Payments" accent={GOLD} subtitle="All payments on these leads, and what is due in the next 30 days" loading={!state} error={state?.error}>
      {p ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            {figures.map(([label, value, color]) => (
              <div key={label} className="rounded-[10px] p-2.5" style={{ background: `${color}14` }}>
                <p className="text-[11.5px] font-medium text-slate-600">{label}</p>
                <p className="text-[18px] font-bold tabular-nums text-slate-900">{value}</p>
                <span className="mt-1 block h-[3px] w-8 rounded-full" style={{ background: color }} aria-hidden="true" />
              </div>
            ))}
          </div>
          <h3 className="mb-1.5 mt-4 text-[11.5px] font-bold uppercase tracking-wider text-slate-500">Due soon</h3>
          {p.upcoming.length ? (
            <ul className="divide-y divide-slate-100">
              {p.upcoming.map((u) => (
                <li key={u.leadId}>
                  <Link href={`/leads/${u.leadId}`} prefetch={false} className="flex items-center justify-between gap-3 py-1.5 text-[13px] hover:bg-slate-50">
                    <span className="min-w-0"><span className="block truncate font-medium text-slate-800">{u.name}</span><span className="block text-[11.5px] text-slate-500">{u.owner || "Unassigned"}</span></span>
                    <span className="shrink-0 text-right"><span className="block font-semibold tabular-nums text-slate-900">{money(u.pending)}</span><span className="block text-[11.5px] text-slate-500">{fmtDay(u.due)}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="text-[13px] text-slate-400">No payments due in the next 30 days.</p>}
        </>
      ) : null}
    </WidgetFrame>
  );
}

export function WorkflowWidget({ state }) {
  const w = state?.data || {};
  const stages = [["legal", "With legal", "/workflow/legal", VIOLET], ["finance", "With finance", "/workflow/finance", GOLD], ["completed", "Completed", "/workflow", GREEN]];
  return (
    <WidgetFrame title="Legal & finance" accent={VIOLET} subtitle="Won deals after sales" loading={!state} error={state?.error} action={<MoreLink href="/workflow">Workflow</MoreLink>}>
      <div className="grid grid-cols-3 gap-2">
        {stages.map(([key, name, href, color]) => (
          <Link key={key} href={href} prefetch={false} className="rounded-[10px] p-3 ring-1 ring-slate-100 hover:ring-slate-300" style={{ background: `${color}12` }}>
            <span className="block text-[22px] font-bold tabular-nums text-slate-900">{count(w[key])}</span>
            <span className="flex items-center gap-1.5 text-[12px] text-slate-600"><span className="h-2 w-2 rounded-full" style={{ background: color }} />{name}</span>
          </Link>
        ))}
      </div>
    </WidgetFrame>
  );
}
