"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import DashboardShell from "../../../components/dashboard/DashboardShell";
import DayTimeline from "../../../components/tracking/DayTimeline";
import EmployeeDayTabs from "../../../components/tracking/EmployeeDayTabs";
import ExportPanel from "../../../components/tracking/ExportPanel";
import TrackingMap from "../../../components/tracking/TrackingMap";
import { REFRESH_MS, formatDay, formatMinutes, formatTime, initials, shiftDate, todayIst } from "../../../components/tracking/trackingClient";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";

const escapeHtml = (text) => String(text ?? "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]));
const toLatLng = (p) => ({ lat: Number(p.latitude), lng: Number(p.longitude) });
const NAV = "grid h-9 w-9 place-items-center rounded-[10px] bg-white text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-40";

/** One field employee's day: route on the map, a time line, visits, trips, attendance and calls. */
export default function EmployeeTrackingPage() {
  const router = useRouter();
  const { userId } = useParams();
  const [session, setSession] = useState(null);
  const [date, setDate] = useState(todayIst());
  const [day, setDay] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = loadSession();
    if (!stored) return router.replace("/login");
    setSession(stored);
  }, [router]);

  const isToday = date === todayIst();
  const load = useCallback(async (quiet = false) => {
    if (!session) return;
    if (!quiet) setLoading(true);
    try {
      setDay(await apiRequest(`/team-tracking/employees/${encodeURIComponent(userId)}/day?date=${date}`, { token: session.token, fresh: true }));
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [session, userId, date]);

  useEffect(() => {
    if (!session) return undefined;
    load();
    if (!isToday) return undefined;
    const timer = setInterval(() => { if (!document.hidden) load(true); }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [session, load, isToday]);

  const activeTrip = day?.trips.find((t) => t.active);
  const paths = useMemo(() => (day?.trips || []).flatMap((t) => t.segments.map((s) => s.map(toLatLng))), [day]);
  const pins = useMemo(() => (day?.visits || []).filter((v) => v.on_map).map((v, i) => ({
    id: `v${i}`,
    position: toLatLng(v),
    number: i + 1,
    color: v.mocked ? "#dc2626" : "#e8bd00",
    title: v.label,
    html: `<div style="font-family:Arial;line-height:1.45"><b>${i + 1}. ${escapeHtml(v.label)}</b><br/>${escapeHtml(formatTime(v.at))}<br/><a target="_blank" rel="noopener" href="https://www.google.com/maps?q=${v.latitude},${v.longitude}" style="color:#0c605d;font-weight:700">Open in Google Maps ↗</a></div>`,
  })), [day]);
  const people = useMemo(() => {
    const last = activeTrip?.segments.at(-1)?.at(-1);
    return last && day ? [{ id: day.user.user_id, position: toLatLng(last), label: initials(day.user.name), color: "#10b981", title: `${day.user.name} · latest position` }] : [];
  }, [activeTrip, day]);

  const role = session?.user?.role;
  const totals = day?.totals;
  const kpis = totals ? [
    ["Distance", `${totals.km.toFixed(1)} km`, "#0c605d"],
    ["Client visits", totals.visits, "#e8bd00"],
    ["Field time", formatMinutes(totals.minutes), "#3b6fd8"],
    ["Trips", totals.trips, "#8a55e6"],
    ["Calls", totals.calls, "#009a8c"],
    ["Lead updates", totals.lead_updates, "#e06a10"],
    ["Mocked GPS", totals.mocked, totals.mocked ? "#dc2626" : "#94a3b8"],
  ] : [];

  return (
    <DashboardShell session={session} title="Field Tracking" hideTitle heroStats={[]}>
      <div className="tw-buttons min-w-0 space-y-4 pb-10">
        {role !== "sales" ? (
          <Link href="/tracking" className="inline-flex items-center gap-1 pt-1 text-[13px] font-semibold text-brand-700 hover:text-brand-800">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>Live field team
          </Link>
        ) : null}

        <header className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] bg-white p-4 ring-1 ring-slate-200">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand-700 text-[17px] font-bold text-white">
              {initials(day?.user?.name || "")}
              {activeTrip ? <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 animate-pulse rounded-full bg-emerald-500 ring-2 ring-white" /> : null}
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-slate-500">{role === "sales" ? "My route" : "Field employee"}</p>
              <h1 className="truncate text-[22px] font-bold tracking-tight text-slate-900">{day?.user?.name || "Loading…"}</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12.5px] text-slate-500">
                {day?.user?.phone ? <a href={`tel:${day.user.phone}`} className="font-semibold text-slate-700 hover:text-brand-700">{day.user.phone}</a> : null}
                {activeTrip
                  ? <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11.5px] font-semibold text-emerald-700 ring-1 ring-emerald-100">Tracking now · since {formatTime(activeTrip.started_at)}</span>
                  : <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11.5px] font-semibold text-slate-600 ring-1 ring-slate-200">Not tracking right now</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Previous day" onClick={() => setDate(shiftDate(date, -1))} className={NAV}><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg></button>
            <input type="date" value={date} max={todayIst()} onChange={(e) => e.target.value && setDate(e.target.value)}
              className="h-9 rounded-[10px] border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-800 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-50" />
            <button type="button" aria-label="Next day" disabled={isToday} onClick={() => setDate(shiftDate(date, 1))} className={NAV}><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg></button>
            {!isToday ? <button type="button" onClick={() => setDate(todayIst())} className="inline-flex h-9 items-center rounded-[10px] bg-brand-700 px-3.5 text-[13px] font-semibold text-white hover:bg-brand-800">Today</button> : null}
          </div>
        </header>

        {error ? <p className="rounded-[12px] bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-800 ring-1 ring-rose-100">{error}</p> : null}
        {day?.truncated ? <p className="rounded-[12px] bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-900 ring-1 ring-amber-100">This day has a very large number of GPS points, so the oldest ones are not shown.</p> : null}

        <div>
          <p className="mb-2 text-[12.5px] font-semibold text-slate-500">{formatDay(date)}{isToday ? " · refreshes every 30 seconds" : ""}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
            {kpis.length ? kpis.map(([label, value, color]) => (
              <div key={label} className="rounded-[14px] bg-white px-4 py-3 ring-1 ring-slate-200">
                <p className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500"><i className="h-2 w-2 rounded-full" style={{ background: color }} />{label}</p>
                <p className="mt-1 text-[20px] font-bold tabular-nums tracking-tight text-slate-900">{value}</p>
              </div>
            )) : Array.from({ length: 7 }, (_, i) => <div key={i} className="h-[74px] animate-pulse rounded-[14px] bg-slate-100" />)}
          </div>
        </div>

        {day ? <DayTimeline day={day} isToday={isToday} /> : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-3">
            <TrackingMap people={people} paths={paths} pins={pins} fitKey={`${userId}-${date}`} className="h-[520px]" />
            {!loading && day && !day.trips.length ? (
              <p className="rounded-[12px] bg-slate-50 px-4 py-3 text-[13px] text-slate-500 ring-1 ring-slate-100">No tracking on this day. The route appears after the employee taps Start tracking in the app.</p>
            ) : null}
          </div>
          <div className="min-w-0 space-y-4">
            {day ? <EmployeeDayTabs day={day} /> : <div className="h-[300px] animate-pulse rounded-[14px] bg-slate-100" />}
            {session ? (
              <ExportPanel token={session.token} title="Field report (Excel)" subtitle="This person's trips, visits, attendance and calls" fileName={`GreenCRM-field-${userId}`}
                path={(from, to) => `/team-tracking/employees/${encodeURIComponent(userId)}/export?from=${from}&to=${to}`} />
            ) : null}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
