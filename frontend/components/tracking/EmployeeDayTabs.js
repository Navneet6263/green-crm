"use client";

import { useState } from "react";
import { formatMinutes, formatTime } from "./trackingClient";

const EMPTY = "rounded-[14px] bg-slate-50 px-4 py-6 text-center text-sm text-slate-400";

function Visits({ visits }) {
  if (!visits.length) return <p className={EMPTY}>No client visits marked on this day.</p>;
  return (
    <ol className="relative space-y-3 before:absolute before:bottom-3 before:left-[15px] before:top-3 before:w-px before:bg-slate-200">
      {visits.map((v, i) => (
        <li key={`${v.at}-${i}`} className="relative flex gap-3">
          <span className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ring-4 ring-white ${v.mocked ? "bg-rose-500 text-white" : "bg-amber-400 text-slate-900"}`}>{i + 1}</span>
          <div className="min-w-0 flex-1 rounded-[14px] bg-slate-50 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-slate-900">{v.label}</p>
              <span className="shrink-0 text-xs font-semibold text-slate-500">{formatTime(v.at)}</span>
            </div>
            <p className="text-xs text-slate-500">
              {v.accuracy !== null ? `±${Math.round(v.accuracy)} m` : "No GPS fix"}
              {v.mocked ? <span className="ml-1 font-semibold text-rose-600">· Mocked GPS</span> : null}
              {v.latitude !== null ? <> · <a className="font-semibold text-indigo-600" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps?q=${v.latitude},${v.longitude}`}>Map ↗</a></> : null}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Trips({ trips }) {
  if (!trips.length) return <p className={EMPTY}>No trips on this day.</p>;
  return (
    <div className="space-y-2">
      {trips.map((t, i) => (
        <div key={t.session_id} className="rounded-[14px] border border-slate-100 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-900">Trip {i + 1}</p>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${t.active ? "bg-emerald-50 text-emerald-700" : t.stopped_at ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700"}`}>
              {t.active ? "Running" : t.stopped_at ? "Completed" : "Not stopped"}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{formatTime(t.started_at)} → {t.stopped_at ? formatTime(t.stopped_at) : t.active ? "now" : "—"} · {formatMinutes(t.minutes)}</p>
          <p className="mt-1 text-xs text-slate-600"><b>{t.km.toFixed(2)} km</b> · {t.visits} visits · {t.fixes} GPS points{t.gaps ? ` · ${t.gaps} signal gaps` : ""}{t.mocked ? <span className="font-semibold text-rose-600"> · {t.mocked} mocked</span> : null}</p>
        </div>
      ))}
    </div>
  );
}

function SimpleList({ rows, empty, render }) {
  if (!rows.length) return <p className={EMPTY}>{empty}</p>;
  return <ul className="divide-y divide-slate-100">{rows.map(render)}</ul>;
}

export default function EmployeeDayTabs({ day }) {
  const [tab, setTab] = useState("visits");
  const tabs = [
    ["visits", "Visits", day.visits.length],
    ["trips", "Trips", day.trips.length],
    ["attendance", "Attendance", day.attendance.length],
    ["activity", "Lead activity", day.activity.length],
    ["calls", "Calls", day.calls.length],
  ];

  return (
    <div className="rounded-[24px] border border-slate-200/60 bg-white p-4 shadow-sm">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map(([key, label, count]) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${tab === key ? "bg-[#0c605d] text-white ring-[#0c605d]" : "bg-white text-slate-600 ring-slate-200"}`}>
            {label} · {count}
          </button>
        ))}
      </div>
      <div className="mt-4 max-h-[420px] overflow-y-auto pr-1">
        {tab === "visits" ? <Visits visits={day.visits} /> : null}
        {tab === "trips" ? <Trips trips={day.trips} /> : null}
        {tab === "attendance" ? (
          <SimpleList rows={day.attendance} empty="No punch in or out on this day." render={(a, i) => (
            <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${a.event_type === "punch_in" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{a.event_type === "punch_in" ? "Punch in" : "Punch out"}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-slate-500">{a.location || `IP ${a.ip_address || "--"}`}</span>
              <span className="text-xs font-semibold text-slate-600">{formatTime(a.created_at)}</span>
            </li>
          )} />
        ) : null}
        {tab === "activity" ? (
          <SimpleList rows={day.activity} empty="No lead updates on this day." render={(a, i) => (
            <li key={i} className="py-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-slate-900">{a.company_name || a.lead_id || "Lead"}</p>
                <span className="shrink-0 text-xs text-slate-500">{formatTime(a.created_at)}</span>
              </div>
              <p className="line-clamp-2 text-xs text-slate-500"><span className="font-semibold capitalize text-slate-600">{String(a.type || "").replace(/_/g, " ")}</span>{a.description ? ` · ${a.description}` : ""}</p>
            </li>
          )} />
        ) : null}
        {tab === "calls" ? (
          <SimpleList rows={day.calls} empty="No calls on this day." render={(c, i) => (
            <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{c.company_name || c.to_number}</p>
                <p className="text-xs text-slate-500">{c.to_number} · <span className="capitalize">{c.status}</span>{c.duration_seconds ? ` · ${Math.floor(c.duration_seconds / 60)}m ${c.duration_seconds % 60}s` : ""}</p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-slate-600">{formatTime(c.created_at)}</span>
            </li>
          )} />
        ) : null}
      </div>
    </div>
  );
}
