"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest } from "../../../lib/api";
import EmailButton from "../../email/EmailButton";
import { parseNote } from "../../updates/updateUtils";
import { MoreLink, WidgetFrame } from "./charts";
import { PALETTE, ago, colorFor, count, fmtDay, money, pct } from "./widgetCatalog";

const time = (value) => new Date(value).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true }).replace(" ", "").toLowerCase();

function DayList({ title, total, items, empty, tone, href, render }) {
  return (
    <div className="min-w-0 rounded-[12px] bg-slate-50/70 p-3 ring-1 ring-slate-100">
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="text-[13px] font-bold text-slate-800">{title} <span className={`ml-1 rounded-full px-1.5 text-[11.5px] tabular-nums ${tone}`}>{count(total)}</span></h3>
        {total > items.length ? <MoreLink href={href}>See all</MoreLink> : null}
      </div>
      {items.length ? <ul className="space-y-1">{items.map(render)}</ul> : <p className="py-3 text-[12.5px] text-slate-400">{empty}</p>}
    </div>
  );
}

const leadRow = (lead) => (
  <li key={lead.leadId}>
    <Link href={`/leads/${lead.leadId}`} prefetch={false} className="flex items-center justify-between gap-2 rounded-[8px] bg-white px-2.5 py-1.5 text-[13px] ring-1 ring-slate-200 hover:ring-brand-300">
      <span className="min-w-0"><span className="block truncate font-medium text-slate-900">{lead.name}</span><span className="block truncate text-[11.5px] text-slate-500">{[lead.contact, lead.phone].filter(Boolean).join(" · ")}</span></span>
      <span className="shrink-0 text-[11.5px] font-semibold text-slate-500">{fmtDay(lead.followUp)}, {time(lead.followUp)}</span>
    </Link>
  </li>
);

export function MyDayWidget({ state }) {
  const d = state?.data;
  return (
    <WidgetFrame title="My day" accent={PALETTE[0]} subtitle="Your own follow-ups and tasks" loading={!state} error={state?.error} action={<MoreLink href="/calendar">Calendar</MoreLink>}>
      {d ? (
        <div className="grid gap-3 lg:grid-cols-3">
          <DayList title="Overdue" total={d.overdue.total} items={d.overdue.items} tone="bg-rose-100 text-rose-700" empty="Nothing overdue. Well done." href="/leads?follow_up=overdue" render={leadRow} />
          <DayList title="Today" total={d.today.total} items={d.today.items} tone="bg-brand-100 text-brand-800" empty="No follow-ups today." href="/leads?follow_up=today" render={leadRow} />
          <DayList title="Tasks due" total={d.tasks.total} items={d.tasks.items} tone="bg-gold-100 text-gold-800" empty="No open tasks." href="/calendar"
            render={(task) => (
              <li key={task.taskId}>
                <Link href={task.leadId ? `/leads/${task.leadId}` : "/calendar"} prefetch={false} className="flex items-center justify-between gap-2 rounded-[8px] bg-white px-2.5 py-1.5 text-[13px] ring-1 ring-slate-200 hover:ring-brand-300">
                  <span className="min-w-0 truncate font-medium text-slate-900">{task.title}</span>
                  <span className={`shrink-0 text-[11.5px] font-semibold ${new Date(task.due) < new Date() ? "text-rose-700" : "text-slate-500"}`}>{fmtDay(task.due)}, {time(task.due)}</span>
                </Link>
              </li>
            )} />
        </div>
      ) : null}
    </WidgetFrame>
  );
}

const SORTS = [["added", "Leads"], ["won", "Won"], ["open", "Open"], ["overdue", "Overdue"], ["updates", "Updates"], ["pipeline", "Pipeline"]];
const initials = (name) => String(name || "?").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const TOP = 5;

function Stat({ label, value, tone = "text-slate-900" }) {
  return <span className="min-w-[44px] text-right"><b className={`block text-[13px] font-bold tabular-nums ${tone}`}>{value}</b><span className="block text-[10.5px] text-slate-400">{label}</span></span>;
}

export function TeamWidget({ state, onPickPerson, size, session }) {
  const [sort, setSort] = useState("added");
  const [all, setAll] = useState(false);
  const rows = [...(state?.data || [])].sort((a, b) => b[sort] - a[sort] || a.name.localeCompare(b.name));
  const shown = all ? rows : rows.slice(0, TOP);
  const best = Math.max(1, ...rows.map((r) => r[sort] || 0));
  const wide = size === "full";
  return (
    <WidgetFrame title="Team performance" accent={PALETTE[4]} subtitle={`${rows.length} people · click a name to see only their work`} loading={!state} error={state?.error}
      action={(
        <select aria-label="Sort people by" value={sort} onChange={(e) => setSort(e.target.value)} className="h-7 rounded-[8px] border border-slate-200 bg-white px-1.5 text-[12px] text-slate-700">
          {SORTS.map(([key, name]) => <option key={key} value={key}>Top by {name.toLowerCase()}</option>)}
        </select>
      )}>
      {rows.length ? (
        <>
          <ul className="space-y-1">
            {shown.map((r, index) => {
              const color = r.userId ? colorFor(r.userId) : "#94a3b8";
              const metric = sort === "pipeline" ? money(r.pipeline) : count(r[sort]);
              return (
                <li key={r.userId || "none"} className="flex items-center gap-2.5 rounded-[10px] px-1.5 py-1.5 hover:bg-slate-50">
                  <span className="w-4 shrink-0 text-center text-[11px] font-bold tabular-nums text-slate-400">{index + 1}</span>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11.5px] font-bold text-white" style={{ background: color }} aria-hidden="true">{r.userId ? initials(r.name) : "?"}</span>
                  <span className="min-w-0 flex-1">
                    {r.userId ? <button type="button" onClick={() => onPickPerson(r.userId)} className="block max-w-full truncate text-left text-[13px] font-semibold text-slate-900 hover:text-brand-700">{r.name}</button> : <span className="block text-[13px] font-semibold text-amber-700">Unassigned</span>}
                    <span className="mt-1 flex items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><span className="block h-full rounded-full" style={{ width: `${((r[sort] || 0) / best) * 100}%`, background: color }} /></span>
                      <span className="shrink-0 text-[11px] font-semibold tabular-nums text-slate-600">{metric}</span>
                    </span>
                  </span>
                  <span className="hidden shrink-0 gap-1 sm:flex">
                    <Stat label="Won" value={count(r.won)} tone="text-emerald-700" />
                    <Stat label="Open" value={count(r.open)} />
                    <Stat label="Overdue" value={count(r.overdue)} tone={r.overdue ? "text-rose-700" : "text-slate-400"} />
                    {wide ? <><Stat label="Conv." value={pct(r.won, r.added)} /><Stat label="Updates" value={count(r.updates)} /><Stat label="Pipeline" value={money(r.pipeline)} /></> : null}
                  </span>
                  {r.userId ? (
                    <span className="flex shrink-0 items-center">
                      <Link href={`/people/${encodeURIComponent(r.userId)}`} prefetch={false} title={`${r.name}'s report`} aria-label={`${r.name}'s report`} className="grid h-7 w-7 place-items-center rounded-[8px] text-slate-400 hover:bg-slate-100 hover:text-brand-700">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 20V10M12 20V4M19 20v-7" /></svg>
                      </Link>
                      <EmailButton session={session} variant="icon" label={`Email ${r.name}`} kind="person" person={{ user_id: r.userId, name: r.name }} defaultTo={[r.userId]} />
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {rows.length > TOP ? (
            <button type="button" onClick={() => setAll((v) => !v)} className="mt-2 w-full rounded-[8px] py-1.5 text-[12.5px] font-semibold text-brand-700 hover:bg-slate-50">
              {all ? "Show top 5" : `Show all ${rows.length} people`}
            </button>
          ) : null}
        </>
      ) : <p className="py-6 text-center text-[13px] text-slate-400">No leads in this view.</p>}
    </WidgetFrame>
  );
}

export function UsageWidget({ state, onPickPerson }) {
  const rows = state?.data || [];
  const quiet = rows.filter((r) => r.quiet).length;
  return (
    <WidgetFrame title="CRM use" accent={PALETTE[5]} subtitle={quiet ? `${quiet} of ${rows.length} people have no activity in 3 days` : "Everyone has been active in the last 3 days"} loading={!state} error={state?.error}>
      {rows.length ? (
        <ul className="divide-y divide-slate-100">
          {rows.slice(0, 8).map((r) => (
            <li key={r.userId} className="flex items-center gap-3 py-2">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${r.quiet ? "bg-amber-500" : "bg-emerald-500"}`} aria-hidden="true" />
              <button type="button" onClick={() => onPickPerson(r.userId)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-[13px] font-semibold text-slate-900 hover:text-brand-700">{r.name}</span>
                <span className="block text-[11.5px] text-slate-500">{r.quiet ? "Quiet" : "Active"} · last activity {ago(r.lastActive).toLowerCase()} · login {ago(r.lastLogin).toLowerCase()}</span>
              </button>
              <span className="shrink-0 text-right text-[12px] tabular-nums text-slate-600"><b className="text-slate-900">{count(r.updates)}</b> updates<span className="block">{count(r.leadsAdded)} leads · {count(r.calls)} calls</span></span>
            </li>
          ))}
        </ul>
      ) : <p className="py-6 text-center text-[13px] text-slate-400">No sales people in this view.</p>}
    </WidgetFrame>
  );
}

export function RecentWidget({ token, range, query }) {
  const [state, setState] = useState(null);
  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    setState(null);
    const params = new URLSearchParams({ limit: "6", page: "1", ...(range.all ? {} : { fromDate: range.from, toDate: range.to }), ...(query.team_ids ? { team_id: query.team_ids } : {}), ...(query.assigned_to ? { users: query.assigned_to } : {}) });
    apiRequest(`/recent-activity/notes?${params}`, { token, fresh: true })
      .then((res) => { if (!cancelled) setState({ data: (res?.items || res?.data || []).slice(0, 6) }); })
      .catch((err) => { if (!cancelled) setState({ error: err.message || "Updates could not load." }); });
    return () => { cancelled = true; };
  }, [token, range.all, range.from, range.to, query.team_ids, query.assigned_to]);
  const rows = state?.data || [];
  return (
    <WidgetFrame title="Recent updates" accent={PALETTE[2]} subtitle={range.all ? "Latest notes" : "Latest notes in this period"} loading={!state} error={state?.error} action={<MoreLink href="/recent-updates">All updates</MoreLink>}>
      {rows.length ? (
        <ul className="space-y-2.5">
          {rows.map((n) => {
            const p = parseNote(n.content);
            const href = n.note_type === "lead" ? `/leads/${n.entity_id}` : `/customers/${n.customer_id}`;
            return (
              <li key={`${n.note_type}-${n.id}`} className="text-[13px]">
                <p className="flex flex-wrap items-baseline justify-between gap-x-2"><span><b className="font-semibold text-slate-900">{n.created_by_name || "User"}</b> <span className="text-slate-400">on</span> <Link href={href} prefetch={false} className="font-semibold text-brand-800 hover:underline">{n.entity_company_name || n.entity_name}</Link></span><span className="text-[11.5px] text-slate-400">{ago(n.created_at)}</span></p>
                <p className="mt-0.5 line-clamp-2 text-slate-600">{[p.statusTo ? `${p.statusFrom ? `${p.statusFrom} → ` : ""}${p.statusTo}` : "", p.response, p.note].filter(Boolean).join(" · ") || "Updated"}</p>
              </li>
            );
          })}
        </ul>
      ) : <p className="py-6 text-center text-[13px] text-slate-400">No updates in this period.</p>}
    </WidgetFrame>
  );
}
