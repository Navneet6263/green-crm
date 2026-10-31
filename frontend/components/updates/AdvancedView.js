"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { Avatar } from "./UpdateCard";
import ReportCustomiser from "../reports/ReportCustomiser";
import { DownloadIcon } from "../reports/ReportDrawer";
import { KINDS, addDays, fmtDateTime, fmtDay, fmtTime, label } from "./updateUtils";

const LOG_STEP = 50;

function Card({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`rounded-[14px] border border-slate-200 bg-white ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <h3 className="text-[14px] font-bold text-slate-900">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-[12px] text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ReportBuilder({ report, onDownload, downloading, error, total, range }) {
  return (
    <Card
      title="Excel report"
      subtitle={`${fmtDay(range.from, { day: "numeric", month: "short", year: "numeric" })} – ${fmtDay(range.to, { day: "numeric", month: "short", year: "numeric" })} · uses the filters above · ${total.toLocaleString("en-IN")} updates · pick a ready-made report or choose your own columns`}
      action={
        <button type="button" disabled={downloading || !report.layout} onClick={onDownload}
          className="inline-flex items-center gap-2 rounded-[10px] bg-brand-700 px-4 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-brand-800 disabled:opacity-50">
          <DownloadIcon />{downloading ? "Preparing…" : "Download Excel"}
        </button>
      }
    >
      <div className="p-3 sm:p-4">
        <ReportCustomiser report={report} />
        {error ? <p className="mt-3 rounded-[10px] bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{error}</p> : null}
      </div>
    </Card>
  );
}

function TrendChart({ notes, range }) {
  const days = useMemo(() => {
    const out = [];
    for (let key = range.from; key <= range.to && out.length < 92; key = addDays(key, 1)) out.push(key);
    return out;
  }, [range.from, range.to]);
  const counts = useMemo(() => {
    const map = new Map();
    for (const n of notes) map.set(n.day, (map.get(n.day) || 0) + 1);
    return map;
  }, [notes]);
  const hours = useMemo(() => {
    const out = new Array(24).fill(0);
    for (const n of notes) out[new Date(new Date(n.created_at).getTime() + 330 * 60000).getUTCHours()] += 1;
    return out;
  }, [notes]);
  const maxDay = Math.max(1, ...days.map((d) => counts.get(d) || 0));
  const maxHour = Math.max(1, ...hours);
  const busiest = hours.indexOf(Math.max(...hours));
  const hourLabel = (h) => `${((h + 11) % 12) + 1}${h < 12 ? "am" : "pm"}`;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <Card title="Updates per day" subtitle={days.length > 1 ? `Busiest: ${fmtDay([...days].sort((a, b) => (counts.get(b) || 0) - (counts.get(a) || 0))[0])}` : "Single day"}>
        <div className="flex h-[150px] items-end gap-[3px] px-4 pb-2 pt-4">
          {days.map((d) => {
            const c = counts.get(d) || 0;
            return (
              <div key={d} className="group relative flex h-full flex-1 flex-col justify-end" title={`${fmtDay(d)}: ${c}`}>
                <div className={`w-full rounded-t-[3px] ${c ? "bg-brand-600 group-hover:bg-brand-800" : "bg-slate-100"}`} style={{ height: `${Math.max(c ? 6 : 3, (c / maxDay) * 100)}%` }} />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between px-4 pb-3 text-[10.5px] font-medium text-slate-400">
          <span>{fmtDay(days[0])}</span>{days.length > 2 ? <span>{fmtDay(days[Math.floor(days.length / 2)])}</span> : null}<span>{fmtDay(days[days.length - 1])}</span>
        </div>
      </Card>
      <Card title="Busy hours" subtitle={notes.length ? `Most updates around ${hourLabel(busiest)}` : "No updates yet"}>
        <div className="flex h-[150px] items-end gap-[2px] px-4 pb-2 pt-4">
          {hours.map((c, h) => (
            <div key={h} className="flex h-full flex-1 flex-col justify-end" title={`${hourLabel(h)}: ${c}`}>
              <div className={`w-full rounded-t-[2px] ${h >= 9 && h < 19 ? "bg-gold-500" : "bg-gold-200"}`} style={{ height: `${Math.max(c ? 6 : 2, (c / maxHour) * 100)}%` }} />
            </div>
          ))}
        </div>
        <div className="flex justify-between px-4 pb-3 text-[10.5px] font-medium text-slate-400"><span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span></div>
      </Card>
    </div>
  );
}

const PEOPLE_COLUMNS = [
  ["updates", "Updates"], ["records", "Records"], ["status", "Status changes"], ["followups", "Follow-up calls"],
  ["demos", "Demos"], ["nextBooked", "Next follow-ups"], ["activeDays", "Active days"], ["last", "Last update"],
];

function PeopleTable({ people, range, onPickPerson, personFilter }) {
  const [sort, setSort] = useState(["updates", -1]);
  const days = useMemo(() => {
    const out = [];
    for (let key = range.from; key <= range.to && out.length < 31; key = addDays(key, 1)) out.push(key);
    return out;
  }, [range.from, range.to]);
  const rows = useMemo(() => people.map((p) => ({ ...p, records: p.records.size, activeDays: p.days.size })).sort((a, b) => {
    const [key, dir] = sort;
    const av = key === "last" ? new Date(a.last).getTime() : a[key];
    const bv = key === "last" ? new Date(b.last).getTime() : b[key];
    return (av - bv) * dir || a.name.localeCompare(b.name);
  }), [people, sort]);
  const max = Math.max(1, ...rows.map((r) => r.updates));
  const maxDay = Math.max(1, ...rows.flatMap((r) => days.map((d) => r.days.get(d) || 0)));

  return (
    <Card title="Person-wise performance" subtitle="Click a column to sort · click a name to see only their updates">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-2.5">Person</th>
              {PEOPLE_COLUMNS.map(([key, name]) => (
                <th key={key} className="px-2 py-2.5 text-right">
                  <button type="button" onClick={() => setSort(([k, d]) => [key, k === key ? -d : -1])} className={`uppercase tracking-wider ${sort[0] === key ? "text-brand-700" : "hover:text-slate-800"}`}>
                    {name}{sort[0] === key ? (sort[1] < 0 ? " ↓" : " ↑") : ""}
                  </button>
                </th>
              ))}
              <th className="px-4 py-2.5">Daily pattern</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className={`border-b border-slate-100 last:border-0 ${personFilter === p.id ? "bg-brand-50/50" : "hover:bg-slate-50/60"}`}>
                <td className="px-4 py-2.5">
                  <button type="button" onClick={() => onPickPerson(personFilter === p.id ? "" : p.id)} className="flex items-center gap-2.5 text-left">
                    <Avatar id={p.id} name={p.name} size="h-8 w-8 text-[11px]" />
                    <span>
                      <span className="block font-semibold text-slate-900 hover:text-brand-700">{p.name}</span>
                      <span className="block text-[11.5px] text-slate-400">{[label(p.role), [...p.teams].join(", ")].filter(Boolean).join(" · ")}</span>
                    </span>
                  </button>
                </td>
                <td className="px-2 py-2.5 text-right">
                  <span className="inline-flex items-center gap-2">
                    <span className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-slate-100 md:block"><span className="block h-full bg-brand-600" style={{ width: `${(p.updates / max) * 100}%` }} /></span>
                    <span className="font-bold tabular-nums text-slate-900">{p.updates}</span>
                  </span>
                </td>
                <td className="px-2 py-2.5 text-right tabular-nums text-slate-700">{p.records}</td>
                <td className="px-2 py-2.5 text-right tabular-nums text-slate-700">{p.status}</td>
                <td className="px-2 py-2.5 text-right tabular-nums text-slate-700">{p.followups}</td>
                <td className="px-2 py-2.5 text-right tabular-nums text-slate-700">{p.demos}</td>
                <td className="px-2 py-2.5 text-right tabular-nums text-slate-700">{p.nextBooked}</td>
                <td className="px-2 py-2.5 text-right tabular-nums text-slate-700">{p.activeDays}</td>
                <td className="whitespace-nowrap px-2 py-2.5 text-right text-[12px] text-slate-500">{p.last ? fmtDateTime(p.last) : "—"}</td>
                <td className="px-4 py-2.5">
                  <div className="flex h-6 items-end gap-[2px]">
                    {days.map((d) => {
                      const c = p.days.get(d) || 0;
                      return <span key={d} title={`${fmtDay(d)}: ${c}`} className={`w-[5px] rounded-[1px] ${c ? "bg-gold-500" : "bg-slate-100"}`} style={{ height: `${Math.max(12, (c / maxDay) * 100)}%` }} />;
                    })}
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length ? <tr><td colSpan={PEOPLE_COLUMNS.length + 2} className="px-4 py-8 text-center text-slate-400">No updates in this period.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function TeamTable({ teams, total, onPickTeam }) {
  return (
    <Card title="Team-wise" subtitle="Based on the team of each lead or customer">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-2.5">Team</th><th className="px-2 py-2.5 text-right">Updates</th><th className="px-2 py-2.5 text-right">People</th>
              <th className="px-2 py-2.5 text-right">Records</th><th className="px-2 py-2.5 text-right">Status changes</th><th className="px-4 py-2.5">Share</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.name} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-2.5">
                  {onPickTeam && t.name !== "No team" ? <button type="button" onClick={() => onPickTeam(t.name)} className="font-semibold text-slate-900 hover:text-brand-700">{t.name}</button> : <span className="font-semibold text-slate-900">{t.name}</span>}
                </td>
                <td className="px-2 py-2.5 text-right font-bold tabular-nums text-slate-900">{t.updates}</td>
                <td className="px-2 py-2.5 text-right tabular-nums text-slate-700">{t.people.size}</td>
                <td className="px-2 py-2.5 text-right tabular-nums text-slate-700">{t.records.size}</td>
                <td className="px-2 py-2.5 text-right tabular-nums text-slate-700">{t.status}</td>
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2">
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-gold-500" style={{ width: `${total ? (t.updates / total) * 100 : 0}%` }} /></span>
                    <span className="w-9 text-right text-[11.5px] font-semibold tabular-nums text-slate-500">{total ? Math.round((t.updates / total) * 100) : 0}%</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function LogTable({ notes }) {
  const [limit, setLimit] = useState(LOG_STEP);
  const [openRow, setOpenRow] = useState("");
  return (
    <Card title="Detailed log" subtitle={`${notes.length.toLocaleString("en-IN")} updates · click a row for the full note`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-2.5">When</th><th className="px-2 py-2.5">By</th><th className="px-2 py-2.5">Lead / customer</th><th className="px-2 py-2.5">Update</th>
              <th className="px-2 py-2.5">Status</th><th className="px-2 py-2.5">Customer said</th><th className="px-2 py-2.5">Next follow-up</th><th className="px-4 py-2.5">Note</th>
            </tr>
          </thead>
          <tbody>
            {notes.slice(0, limit).map((n) => {
              const key = `${n.note_type}-${n.id}`;
              const p = n.parsed;
              const kind = KINDS[p.kind];
              const href = n.note_type === "lead" ? `/leads/${encodeURIComponent(n.entity_id)}` : `/customers/${encodeURIComponent(n.customer_id)}`;
              const expanded = openRow === key;
              return (
                <Fragment key={key}>
                  <tr onClick={() => setOpenRow(expanded ? "" : key)} className={`cursor-pointer border-b border-slate-100 align-top ${expanded ? "bg-brand-50/40" : "hover:bg-slate-50/60"}`}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-500"><span className="font-semibold text-slate-800">{fmtDay(n.day)}</span> {fmtTime(n.created_at)}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 font-medium text-slate-800">{n.created_by_name || "—"}</td>
                    <td className="max-w-[200px] px-2 py-2.5">
                      <Link href={href} prefetch={false} onClick={(e) => e.stopPropagation()} className="block truncate font-semibold text-brand-800 hover:underline">{n.entity_company_name || n.entity_name || "—"}</Link>
                      <span className="block truncate text-[11.5px] text-slate-400">{[n.note_type === "lead" ? "Lead" : "Customer", n.product_name, n.team_name].filter(Boolean).join(" · ")}</span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${kind.chip}`}><span className={`h-1.5 w-1.5 rounded-full ${kind.dot}`} />{kind.label}</span></td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-slate-700">{p.statusTo ? <>{p.statusFrom ? <span className="text-slate-400">{p.statusFrom} → </span> : null}<b className="font-semibold">{p.statusTo}</b></> : <span className="text-slate-300">—</span>}</td>
                    <td className="max-w-[180px] px-2 py-2.5 text-slate-700"><span className="line-clamp-2">{[p.callStatus, p.response].filter(Boolean).join(" · ") || <span className="text-slate-300">—</span>}</span></td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-slate-700">{p.nextFollowUp || p.demoAt || <span className="text-slate-300">—</span>}</td>
                    <td className="max-w-[320px] px-4 py-2.5 text-slate-700"><span className={expanded ? "whitespace-pre-line" : "line-clamp-2"}>{p.note || <span className="text-slate-300">—</span>}</span></td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {notes.length > limit ? (
        <div className="flex justify-center border-t border-slate-100 p-3">
          <button type="button" onClick={() => setLimit((l) => l + LOG_STEP)} className="rounded-[10px] px-4 py-2 text-[13px] font-semibold text-brand-800 ring-1 ring-slate-200 hover:bg-brand-50">
            Show {Math.min(LOG_STEP, notes.length - limit)} more rows
          </button>
        </div>
      ) : null}
    </Card>
  );
}

export default function AdvancedView({ notes, summary, range, canSeeTeam, showTeams, personFilter, onPickPerson, onPickTeam, onDownload, downloading, downloadError, total, report }) {
  return (
    <div className="tw-buttons space-y-4">
      <ReportBuilder report={report} onDownload={onDownload} downloading={downloading} error={downloadError} total={total} range={range} />
      <TrendChart notes={notes} range={range} />
      {canSeeTeam && showTeams && summary.teams.length > 1 ? <TeamTable teams={summary.teams} total={summary.totals.updates} onPickTeam={onPickTeam} /> : null}
      {canSeeTeam ? <PeopleTable people={summary.people} range={range} onPickPerson={onPickPerson} personFilter={personFilter} /> : null}
      <LogTable notes={notes} />
    </div>
  );
}
