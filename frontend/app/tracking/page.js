"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../../components/dashboard/DashboardShell";
import ExportPanel from "../../components/tracking/ExportPanel";
import LiveTeamList, { statusLine } from "../../components/tracking/LiveTeamList";
import TrackingMap from "../../components/tracking/TrackingMap";
import { REFRESH_MS, STATUS_META, formatTime, initials } from "../../components/tracking/trackingClient";
import { apiRequest } from "../../lib/api";
import { loadSession } from "../../lib/session";

const ORDER = { live: 0, idle: 1, off: 2 };
const escapeHtml = (text) => String(text ?? "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]));
const SCOPE = { company: "Whole company", team: "Your teams", self: "Just you" };

function Stat({ label, value, hint, color, pulse }) {
  return (
    <div className="rounded-[14px] bg-white px-4 py-3.5 ring-1 ring-slate-200">
      <p className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500">
        <span className="relative flex h-2 w-2">{pulse ? <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: color }} /> : null}<span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: color }} /></span>
        {label}
      </p>
      <p className="mt-1.5 text-[24px] font-bold leading-none tabular-nums tracking-tight text-slate-900">{value}</p>
      <p className="mt-1.5 truncate text-[11.5px] text-slate-500">{hint}</p>
    </div>
  );
}

/** Live field team: who is out, where they are, and their visits today. */
export default function FieldTrackingPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [board, setBoard] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const stored = loadSession();
    if (!stored) return router.replace("/login");
    if (stored.user?.role === "sales") return router.replace(`/tracking/${stored.user.user_id || stored.user.id}`);
    setSession(stored);
  }, [router]);

  const load = useCallback(async () => {
    if (!session) return;
    setRefreshing(true);
    try {
      setBoard(await apiRequest("/team-tracking/live", { token: session.token, fresh: true }));
      setNow(Date.now());
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }, [session]);

  useEffect(() => {
    if (!session) return undefined;
    load();
    const timer = setInterval(() => { if (!document.hidden) load(); }, REFRESH_MS);
    const onVisible = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [session, load]);

  const employees = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (board?.employees || [])
      .filter((e) => filter === "all" || e.status === filter)
      .filter((e) => !q || `${e.name} ${e.phone || ""}`.toLowerCase().includes(q))
      .sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.name.localeCompare(b.name));
  }, [board, filter, query]);

  const people = useMemo(() => employees
    .filter((e) => e.status !== "off" && e.last_fix)
    .map((e) => ({
      id: e.user_id,
      position: { lat: e.last_fix.latitude, lng: e.last_fix.longitude },
      label: initials(e.name),
      color: STATUS_META[e.status].color,
      title: e.name,
      html: `<div style="font-family:Arial;min-width:190px;line-height:1.45"><b style="font-size:14px">${escapeHtml(e.name)}</b><br/><span style="color:#475569">${escapeHtml(statusLine(e, now))}</span>${e.last_visit ? `<br/><span style="color:#475569">Last visit: ${escapeHtml(e.last_visit.label)} (${escapeHtml(formatTime(e.last_visit.at))})</span>` : ""}<br/><a href="/tracking/${encodeURIComponent(e.user_id)}" style="color:#0c605d;font-weight:700">Open full day →</a></div>`,
    })), [employees, now]);

  const counts = board?.counts || { total: 0, live: 0, idle: 0, off: 0 };
  const all = board?.employees || [];
  const visits = all.reduce((sum, e) => sum + (e.visits_today || 0), 0);
  const leaders = [...all].filter((e) => e.visits_today).sort((a, b) => b.visits_today - a.visits_today).slice(0, 5);
  const out = counts.live + counts.idle;

  return (
    <DashboardShell session={session} title="Field Tracking" hideTitle heroStats={[]}>
      <div className="tw-buttons min-w-0 space-y-4 pb-10">
        <header className="flex flex-wrap items-end justify-between gap-3 pt-1">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-slate-500">{SCOPE[board?.scope] || "Field team"}</p>
            <h1 className="text-[22px] font-bold tracking-tight text-slate-900">Live field team</h1>
            <p className="mt-0.5 text-[13px] text-slate-500">Where your people are right now. A person shows on the map only after they tap Start tracking in the app.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 ring-1 ring-slate-200 sm:inline-flex">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
              Auto-refresh · {board ? formatTime(board.generated_at) : "--"}
            </span>
            <button type="button" onClick={load} disabled={refreshing} className="inline-flex h-9 items-center rounded-[10px] bg-white px-3.5 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60">{refreshing ? "Refreshing…" : "Refresh"}</button>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Live now" value={counts.live} hint={counts.total ? `${Math.round((counts.live / counts.total) * 100)}% of the field team` : "Nobody yet"} color="#10b981" pulse={counts.live > 0} />
          <Stat label="No recent update" value={counts.idle} hint="Started, but no GPS for a while" color="#f59e0b" />
          <Stat label="Tracking off" value={counts.off} hint={`${out} of ${counts.total} are out today`} color="#94a3b8" />
          <Stat label="Client visits today" value={visits} hint={leaders[0] ? `Most: ${leaders[0].name} (${leaders[0].visits_today})` : "No visit marked yet"} color="#e8bd00" />
        </div>

        {error ? <p className="rounded-[12px] bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-800 ring-1 ring-rose-100">{error}</p> : null}

        <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <LiveTeamList board={board} employees={employees} filter={filter} setFilter={setFilter} query={query} setQuery={setQuery} selectedId={selectedId} onLocate={setSelectedId} now={now} />

          <div className="min-w-0 space-y-4">
            <div className="relative">
              <TrackingMap people={people} selectedId={selectedId} onSelect={setSelectedId} fitKey={filter} className="h-[600px]" />
              <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-1.5">
                {["live", "idle"].map((key) => (
                  <span key={key} className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11.5px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
                    <i className={`h-2 w-2 rounded-full ${STATUS_META[key].dot}`} />{STATUS_META[key].label} · {counts[key]}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <section className="rounded-[14px] bg-white p-4 ring-1 ring-slate-200">
                <p className="text-[14px] font-bold text-slate-900">Most visits today</p>
                <p className="text-[12px] text-slate-500">Client visits marked in the app</p>
                {leaders.length ? (
                  <ol className="mt-3 space-y-2">
                    {leaders.map((e, i) => (
                      <li key={e.user_id} className="grid grid-cols-[20px_minmax(0,120px)_minmax(0,1fr)_auto] items-center gap-2 text-[12.5px]">
                        <span className="font-bold text-slate-400">{i + 1}</span>
                        <Link href={`/tracking/${encodeURIComponent(e.user_id)}`} className="truncate font-semibold text-slate-800 hover:text-brand-700">{e.name}</Link>
                        <span className="h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-[#e8bd00]" style={{ width: `${(e.visits_today / leaders[0].visits_today) * 100}%` }} /></span>
                        <b className="tabular-nums text-slate-900">{e.visits_today}</b>
                      </li>
                    ))}
                  </ol>
                ) : <p className="py-6 text-center text-[13px] text-slate-500">No visits marked yet today.</p>}
              </section>
              {session ? (
                <ExportPanel token={session.token} title="Team report (Excel)" subtitle="Trips, distance, visits and attendance for everyone" fileName="GreenCRM-team-field-report"
                  path={(from, to) => `/team-tracking/export?from=${from}&to=${to}`} />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
