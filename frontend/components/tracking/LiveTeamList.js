"use client";

import Link from "next/link";
import { STATUS_META, formatTime, initials, timeAgo } from "./trackingClient";

export function statusLine(employee, now) {
  if (employee.status === "live") return `Live · updated ${timeAgo(employee.last_fix?.at, now)}`;
  if (employee.status === "idle") return employee.last_fix ? `No update for ${timeAgo(employee.last_fix.at, now).replace(" ago", "")}` : "Started · waiting for GPS";
  return employee.last_stopped_at ? `Off · stopped ${timeAgo(employee.last_stopped_at, now)}` : "Tracking off";
}

const TEXT = { live: "text-emerald-700", idle: "text-amber-700", off: "text-slate-400" };

/** The field team beside the map: search, filter by status, locate someone or open their day. */
export default function LiveTeamList({ board, employees, filter, setFilter, query, setQuery, selectedId, onLocate, now }) {
  const counts = board?.counts || { total: 0, live: 0, idle: 0, off: 0 };
  const tabs = [["all", "All", counts.total], ["live", "Live", counts.live], ["idle", "No GPS", counts.idle], ["off", "Off", counts.off]];

  return (
    <div className="flex min-h-0 flex-col rounded-[14px] bg-white ring-1 ring-slate-200">
      <div className="space-y-2.5 border-b border-slate-100 p-3">
        <div className="relative">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or phone"
            className="w-full rounded-[10px] border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13.5px] outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-50" />
        </div>
        <div className="flex gap-1 rounded-[10px] bg-slate-100 p-0.5">
          {tabs.map(([key, label, count]) => (
            <button key={key} type="button" onClick={() => setFilter(key)} aria-pressed={filter === key}
              className={`min-w-0 flex-1 truncate rounded-[8px] px-2 py-1.5 text-[12px] font-semibold transition ${filter === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
              {label} <span className="tabular-nums text-slate-400">{count}</span>
            </button>
          ))}
        </div>
      </div>

      <ul className="max-h-[560px] min-h-[200px] flex-1 divide-y divide-slate-100 overflow-y-auto">
        {!board ? Array.from({ length: 5 }, (_, i) => <li key={i} className="m-3 h-[64px] animate-pulse rounded-[12px] bg-slate-100" />) : null}
        {board && !employees.length ? (
          <li className="px-4 py-12 text-center">
            <p className="text-[14px] font-semibold text-slate-700">Nobody here</p>
            <p className="mt-1 text-[12.5px] text-slate-500">{counts.total ? "Try another filter or search." : "Field staff appear once they sign in to the mobile app."}</p>
          </li>
        ) : null}
        {employees.map((e) => {
          const meta = STATUS_META[e.status];
          const active = e.user_id === selectedId;
          const canLocate = e.status !== "off" && e.last_fix;
          return (
            <li key={e.user_id} className={`group px-3 py-2.5 transition ${active ? "bg-brand-50/70" : "hover:bg-slate-50"}`}>
              <div className="flex items-center gap-3">
                <button type="button" disabled={!canLocate} onClick={() => onLocate(e.user_id)} title={canLocate ? "Show on map" : "No location"}
                  className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-700 text-[12px] font-bold text-white disabled:cursor-default disabled:bg-slate-400">
                  {initials(e.name)}
                  <span className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full ring-2 ring-white ${meta.dot} ${e.status === "live" ? "animate-pulse" : ""}`} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13.5px] font-semibold text-slate-900">{e.name}</p>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-600" title="Client visits today">{e.visits_today} visit{e.visits_today === 1 ? "" : "s"}</span>
                  </div>
                  <p className={`truncate text-[12px] ${TEXT[e.status]}`}>{statusLine(e, now)}</p>
                  <p className="truncate text-[11.5px] text-slate-500">{e.last_visit ? `Last visit: ${e.last_visit.label} · ${formatTime(e.last_visit.at)}` : "No visit marked yet"}</p>
                </div>
              </div>
              <div className="mt-2 flex gap-1.5 pl-[52px]">
                {canLocate ? <button type="button" onClick={() => onLocate(e.user_id)} className="rounded-[8px] bg-white px-2.5 py-1 text-[12px] font-semibold text-brand-800 ring-1 ring-brand-200 hover:bg-brand-50">Locate</button> : null}
                <Link href={`/tracking/${encodeURIComponent(e.user_id)}`} className="rounded-[8px] bg-white px-2.5 py-1 text-[12px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">View day</Link>
                {e.phone ? <a href={`tel:${e.phone}`} className="rounded-[8px] bg-white px-2.5 py-1 text-[12px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">Call</a> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
