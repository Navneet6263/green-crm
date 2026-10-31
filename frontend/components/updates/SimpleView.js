"use client";

import { useMemo, useState } from "react";
import UpdateCard, { Avatar } from "./UpdateCard";
import { KINDS, dayHeading, fmtTime, label } from "./updateUtils";

const STEP = 40;

export function StatCard({ title, value, hint, tone = "brand", icon }) {
  const tones = {
    brand: "bg-brand-50 text-brand-700",
    gold: "bg-gold-50 text-gold-700",
    sky: "bg-sky-50 text-sky-700",
    violet: "bg-violet-50 text-violet-700",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <div className="rounded-[14px] border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-semibold text-slate-500">{title}</p>
        <span className={`grid h-8 w-8 place-items-center rounded-[10px] ${tones[tone]}`}>{icon}</span>
      </div>
      <p className="mt-1 text-[26px] font-bold leading-none tracking-tight text-slate-900 tabular-nums">{Number(value || 0).toLocaleString("en-IN")}</p>
      {hint ? <p className="mt-1.5 text-[11.5px] text-slate-400">{hint}</p> : null}
    </div>
  );
}

const ICON = {
  updates: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h10M4 18h7" /></svg>,
  records: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21V7l9-4 9 4v14" /><path d="M9 21v-6h6v6" /></svg>,
  status: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>,
  next: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>,
  people: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6" /></svg>,
  demo: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>,
};
export { ICON };

export function StatRow({ totals, canSeeTeam }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <StatCard title="Updates" value={totals.updates} hint={`${totals.lead} on leads · ${totals.customer} on customers`} icon={ICON.updates} />
      <StatCard title="Leads & customers updated" value={totals.records} hint="Different records touched" tone="slate" icon={ICON.records} />
      <StatCard title="Status changes" value={totals.status} hint={`${totals.demos} demos booked`} tone="sky" icon={ICON.status} />
      <StatCard title="Next follow-ups set" value={totals.nextBooked} hint={`${totals.responses} customer responses noted`} tone="gold" icon={ICON.next} />
      {canSeeTeam
        ? <StatCard title="People updating" value={totals.people} hint="Wrote at least one update" tone="violet" icon={ICON.people} />
        : <StatCard title="Follow-up calls" value={totals.followups} hint="Logged with call status" tone="violet" icon={ICON.demo} />}
    </div>
  );
}

function Panel({ title, action, children }) {
  return (
    <section className="rounded-[14px] border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <h3 className="text-[13px] font-bold text-slate-900">{title}</h3>
        {action}
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

export default function SimpleView({ notes, summary, canSeeTeam, personFilter, onPickPerson, kindFilter, setKindFilter }) {
  const [visible, setVisible] = useState(STEP);
  const shown = useMemo(() => (kindFilter ? notes.filter((n) => n.parsed.kind === kindFilter) : notes), [notes, kindFilter]);
  const groups = useMemo(() => {
    const out = [];
    for (const note of shown.slice(0, visible)) {
      if (!out.length || out[out.length - 1].day !== note.day) out.push({ day: note.day, items: [] });
      out[out.length - 1].items.push(note);
    }
    return out;
  }, [shown, visible]);
  const dayCounts = useMemo(() => {
    const map = new Map();
    for (const n of shown) map.set(n.day, (map.get(n.day) || 0) + 1);
    return map;
  }, [shown]);
  const kindCounts = useMemo(() => {
    const out = { status: 0, followup: 0, demo: 0, note: 0 };
    for (const n of notes) out[n.parsed.kind] += 1;
    return out;
  }, [notes]);
  const maxPerson = summary.people[0]?.updates || 1;

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <div className="tw-buttons mb-3 flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => setKindFilter("")}
            className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition ${!kindFilter ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
            Everything <span className="opacity-60">{notes.length}</span>
          </button>
          {Object.entries(KINDS).map(([key, kind]) => (
            <button key={key} type="button" onClick={() => setKindFilter(kindFilter === key ? "" : key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition ${kindFilter === key ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
              <span className={`h-2 w-2 rounded-full ${kind.dot}`} />{kind.plural} <span className="opacity-60">{kindCounts[key]}</span>
            </button>
          ))}
        </div>

        {groups.length ? (
          <div className="space-y-5">
            {groups.map((group) => (
              <section key={group.day}>
                <div className="sticky top-[60px] z-10 -mx-1 mb-2 flex items-center gap-3 bg-[#f7f8f6]/95 px-1 py-1.5 backdrop-blur">
                  <h3 className="text-[13px] font-bold text-slate-800">{dayHeading(group.day)}</h3>
                  <span className="h-px flex-1 bg-slate-200" />
                  <span className="text-[11.5px] font-semibold text-slate-400">{dayCounts.get(group.day)} update{dayCounts.get(group.day) === 1 ? "" : "s"}</span>
                </div>
                <div className="space-y-2.5">
                  {group.items.map((note) => <UpdateCard key={`${note.note_type}-${note.id}`} note={note} />)}
                </div>
              </section>
            ))}
            {shown.length > visible ? (
              <div className="tw-buttons flex justify-center pt-1">
                <button type="button" onClick={() => setVisible((v) => v + STEP)}
                  className="rounded-[10px] bg-white px-5 py-2.5 text-[13px] font-semibold text-brand-800 ring-1 ring-slate-200 hover:bg-brand-50">
                  Show {Math.min(STEP, shown.length - visible)} more · {shown.length - visible} left
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-[14px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <p className="text-[15px] font-semibold text-slate-800">No updates in this period</p>
            <p className="mt-1 text-[13px] text-slate-500">Try a longer date range or clear the filters.</p>
          </div>
        )}
      </div>

      <aside className="tw-buttons space-y-4 xl:sticky xl:top-[76px]">
        {canSeeTeam ? (
          <Panel title="Who is updating" action={personFilter ? <button type="button" onClick={() => onPickPerson("")} className="text-[12px] font-semibold text-brand-700 hover:underline">Show all</button> : <span className="text-[11.5px] text-slate-400">Click a name to filter</span>}>
            {summary.people.length ? (
              <ul className="max-h-[360px] space-y-0.5 overflow-y-auto">
                {summary.people.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => onPickPerson(personFilter === p.id ? "" : p.id)}
                      className={`flex w-full items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-left transition ${personFilter === p.id ? "bg-brand-50 ring-1 ring-brand-200" : "hover:bg-slate-50"}`}>
                      <Avatar id={p.id} name={p.name} size="h-7 w-7 text-[10.5px]" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-[13px] font-semibold text-slate-800">{p.name}</span>
                          <span className="text-[12.5px] font-bold tabular-nums text-slate-900">{p.updates}</span>
                        </span>
                        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <span className="block h-full rounded-full bg-brand-600" style={{ width: `${(p.updates / maxPerson) * 100}%` }} />
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-slate-400">{p.records.size} records · last {fmtTime(p.last)}{p.teams.size ? ` · ${[...p.teams][0]}` : ""}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="px-1 py-2 text-[12.5px] text-slate-400">Nobody has written an update yet.</p>}
          </Panel>
        ) : null}

        <Panel title="Status moves">
          {summary.statuses.length ? (
            <ul className="space-y-1.5 px-1">
              {summary.statuses.slice(0, 8).map(([status, count]) => (
                <li key={status} className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="truncate text-slate-700">→ {label(status)}</span>
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11.5px] font-bold text-brand-800">{count}</span>
                </li>
              ))}
            </ul>
          ) : <p className="px-1 py-1 text-[12.5px] text-slate-400">No status changes in this period.</p>}
        </Panel>

        <Panel title="Kind of updates">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
            {Object.entries(KINDS).map(([key, kind]) => (notes.length && kindCounts[key]
              ? <span key={key} className={kind.dot} style={{ width: `${(kindCounts[key] / notes.length) * 100}%` }} title={`${kind.label}: ${kindCounts[key]}`} /> : null))}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-2 px-0.5">
            {Object.entries(KINDS).map(([key, kind]) => (
              <li key={key} className="flex items-center gap-1.5 text-[12px] text-slate-600">
                <span className={`h-2 w-2 rounded-full ${kind.dot}`} />{kind.label}
                <span className="ml-auto font-semibold tabular-nums text-slate-900">{kindCounts[key]}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </aside>
    </div>
  );
}
