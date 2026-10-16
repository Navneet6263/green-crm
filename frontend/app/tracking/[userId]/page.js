"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import DashboardShell from "../../../components/dashboard/DashboardShell";
import EmployeeDayTabs from "../../../components/tracking/EmployeeDayTabs";
import ExportPanel from "../../../components/tracking/ExportPanel";
import TrackingMap from "../../../components/tracking/TrackingMap";
import { REFRESH_MS, formatDay, formatMinutes, formatTime, initials, shiftDate, todayIst } from "../../../components/tracking/trackingClient";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";

const escapeHtml = (text) => String(text ?? "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]));
const toLatLng = (p) => ({ lat: Number(p.latitude), lng: Number(p.longitude) });

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
    html: `<div style="font-family:Arial"><b>${i + 1}. ${escapeHtml(v.label)}</b><br/>${escapeHtml(formatTime(v.at))}<br/><a target="_blank" rel="noopener" href="https://www.google.com/maps?q=${v.latitude},${v.longitude}" style="color:#157672">Open in Google Maps ↗</a></div>`,
  })), [day]);
  const people = useMemo(() => {
    const last = activeTrip?.segments.at(-1)?.at(-1);
    return last && day ? [{ id: day.user.user_id, position: toLatLng(last), label: initials(day.user.name), color: "#10b981", title: `${day.user.name} · latest position` }] : [];
  }, [activeTrip, day]);

  const role = session?.user?.role;
  const totals = day?.totals;
  const kpis = totals ? [
    ["Distance", `${totals.km.toFixed(2)} km`, "text-[#0c605d]"],
    ["Client visits", totals.visits, "text-slate-900"],
    ["Field time", formatMinutes(totals.minutes), "text-slate-900"],
    ["Trips", totals.trips, "text-slate-900"],
    ["Calls", totals.calls, "text-slate-900"],
    ["Lead updates", totals.lead_updates, "text-slate-900"],
    ["Mocked GPS", totals.mocked, totals.mocked ? "text-rose-600" : "text-slate-900"],
  ] : [];

  return (
    <DashboardShell session={session} title="Field Tracking" hideTitle heroStats={[]}>
      <section className="tw-buttons space-y-5">
        {role !== "sales" ? <Link href="/tracking" className="inline-flex text-sm font-semibold text-indigo-600 hover:text-indigo-700">← Back to live team</Link> : null}

        <div className="flex flex-col gap-4 rounded-[24px] border border-slate-200/60 bg-white p-5 shadow-sm md:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-[#0c605d] text-lg font-bold text-white">{initials(day?.user?.name || "")}</span>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-indigo-500">{role === "sales" ? "My route" : "Field employee"}</p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{day?.user?.name || "Loading…"}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                {day?.user?.phone ? <a href={`tel:${day.user.phone}`} className="hover:text-indigo-600">📞 {day.user.phone}</a> : null}
                {activeTrip ? <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">● Tracking now since {formatTime(activeTrip.started_at)}</span> : null}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setDate(shiftDate(date, -1))} className="grid h-10 w-10 place-items-center rounded-full bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-white">◀</button>
            <input type="date" value={date} max={todayIst()} onChange={(e) => e.target.value && setDate(e.target.value)}
              className="rounded-[12px] border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800" />
            <button type="button" disabled={isToday} onClick={() => setDate(shiftDate(date, 1))} className="grid h-10 w-10 place-items-center rounded-full bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-white disabled:opacity-40">▶</button>
            {!isToday ? <button type="button" onClick={() => setDate(todayIst())} className="rounded-full bg-indigo-600 px-3 py-2 text-xs font-bold text-white">Today</button> : null}
          </div>
        </div>

        {error ? <div className="rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}
        {day?.truncated ? <div className="rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">This day has a very large number of GPS points; the oldest points beyond the limit are not shown.</div> : null}

        <div>
          <p className="mb-2 text-sm font-semibold text-slate-500">{formatDay(date)}{isToday ? " · refreshes every 30 seconds" : ""}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
            {kpis.length ? kpis.map(([label, value, tone]) => (
              <div key={label} className="rounded-[18px] border border-slate-200/60 bg-white px-4 py-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                <p className={`mt-1 text-xl font-bold ${tone}`}>{value}</p>
              </div>
            )) : Array.from({ length: 7 }, (_, i) => <div key={i} className="h-[70px] animate-pulse rounded-[18px] bg-slate-100" />)}
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <div className="space-y-3">
            <TrackingMap people={people} paths={paths} pins={pins} fitKey={`${userId}-${date}`} className="h-[480px]" />
            {!loading && day && !day.trips.length ? (
              <p className="rounded-[16px] bg-slate-50 px-4 py-3 text-sm text-slate-500">No tracking on this day. Location appears only after the employee taps Start tracking in the app.</p>
            ) : null}
          </div>
          <div className="space-y-5">
            {day ? <EmployeeDayTabs day={day} /> : null}
            {session ? (
              <ExportPanel token={session.token} title="Download field report (Excel)" fileName={`GreenCRM-field-${userId}`}
                path={(from, to) => `/team-tracking/employees/${encodeURIComponent(userId)}/export?from=${from}&to=${to}`} />
            ) : null}
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}
