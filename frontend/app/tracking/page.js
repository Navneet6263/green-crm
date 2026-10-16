"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../../components/dashboard/DashboardShell";
import ExportPanel from "../../components/tracking/ExportPanel";
import TrackingMap from "../../components/tracking/TrackingMap";
import { REFRESH_MS, STATUS_META, formatTime, initials, timeAgo } from "../../components/tracking/trackingClient";
import { apiRequest } from "../../lib/api";
import { loadSession } from "../../lib/session";

const ORDER = { live: 0, idle: 1, off: 2 };
const escapeHtml = (text) => String(text ?? "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]));

function statusLine(employee, now) {
  if (employee.status === "live") return `Live · updated ${timeAgo(employee.last_fix?.at, now)}`;
  if (employee.status === "idle") return employee.last_fix ? `No update for ${timeAgo(employee.last_fix.at, now).replace(" ago", "")}` : "Tracking started · waiting for GPS";
  return employee.last_stopped_at ? `Tracking off · stopped ${timeAgo(employee.last_stopped_at, now)}` : "Tracking off";
}

export default function FieldTrackingPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [board, setBoard] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const stored = loadSession();
    if (!stored) return router.replace("/login");
    if (stored.user?.role === "sales") return router.replace(`/tracking/${stored.user.user_id || stored.user.id}`);
    setSession(stored);
  }, [router]);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      setBoard(await apiRequest("/team-tracking/live", { token: session.token, fresh: true }));
      setNow(Date.now());
      setError("");
    } catch (err) {
      setError(err.message);
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
    const list = (board?.employees || [])
      .filter((e) => filter === "all" || e.status === filter)
      .filter((e) => !query || `${e.name} ${e.phone || ""}`.toLowerCase().includes(query.toLowerCase()));
    return list.sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.name.localeCompare(b.name));
  }, [board, filter, query]);

  const people = useMemo(() => employees
    .filter((e) => e.status !== "off" && e.last_fix)
    .map((e) => ({
      id: e.user_id,
      position: { lat: e.last_fix.latitude, lng: e.last_fix.longitude },
      label: initials(e.name),
      color: STATUS_META[e.status].color,
      title: e.name,
      html: `<div style="font-family:Arial;min-width:180px"><b>${escapeHtml(e.name)}</b><br/>${escapeHtml(statusLine(e, now))}${e.last_visit ? `<br/>Last visit: ${escapeHtml(e.last_visit.label)} (${escapeHtml(formatTime(e.last_visit.at))})` : ""}<br/><a href="/tracking/${encodeURIComponent(e.user_id)}" style="color:#157672;font-weight:700">Open full day →</a></div>`,
    })), [employees, now]);

  const counts = board?.counts || { total: 0, live: 0, idle: 0, off: 0 };
  const tabs = [["all", "All", counts.total], ["live", "Live", counts.live], ["idle", "No update", counts.idle], ["off", "Off", counts.off]];

  return (
    <DashboardShell session={session} title="Field Tracking" hideTitle heroStats={[]}>
      <section className="tw-buttons space-y-5">
        <div className="flex flex-col gap-4 rounded-[24px] border border-slate-200/60 bg-white p-5 shadow-sm md:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-indigo-500">{board?.scope === "company" ? "Whole company" : "Your teams"}</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Live Field Team</h1>
            <p className="mt-1 text-sm text-slate-500">
              Refreshes every 30 seconds{board ? ` · last updated ${formatTime(board.generated_at)}` : ""}. Location is shown only while an employee has started tracking.
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[["Live", counts.live, "text-emerald-600"], ["No update", counts.idle, "text-amber-600"], ["Off", counts.off, "text-slate-500"], ["Total", counts.total, "text-slate-900"]].map(([label, value, tone]) => (
              <div key={label} className="rounded-[16px] bg-slate-50 px-4 py-3 text-center">
                <p className={`text-2xl font-bold ${tone}`}>{value}</p>
                <p className="text-[11px] font-semibold text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {error ? <div className="rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}

        <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
          <div className="flex min-h-0 flex-col rounded-[24px] border border-slate-200/60 bg-white p-4 shadow-sm">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search employee…"
              className="w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-300 focus:bg-white" />
            <div className="mt-3 flex gap-1.5 overflow-x-auto">
              {tabs.map(([key, label, count]) => (
                <button key={key} type="button" onClick={() => setFilter(key)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 transition ${filter === key ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200"}`}>
                  {label} · {count}
                </button>
              ))}
            </div>
            <div className="mt-3 max-h-[560px] space-y-2 overflow-y-auto pr-1">
              {!board ? <p className="py-8 text-center text-sm text-slate-400">Loading team…</p> : null}
              {board && !employees.length ? <p className="py-8 text-center text-sm text-slate-400">No sales employees match.</p> : null}
              {employees.map((e) => {
                const meta = STATUS_META[e.status];
                const active = e.user_id === selectedId;
                return (
                  <div key={e.user_id} className={`rounded-[16px] border p-3 transition ${active ? "border-indigo-300 bg-indigo-50/50" : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"}`}>
                    <div className="flex items-start gap-3">
                      <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#0c605d] text-sm font-bold text-white">
                        {initials(e.name)}
                        <span className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full ring-2 ring-white ${meta.dot}`} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900">{e.name}</p>
                        <p className={`text-xs ${e.status === "live" ? "text-emerald-700" : e.status === "idle" ? "text-amber-700" : "text-slate-400"}`}>{statusLine(e, now)}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {e.last_visit ? `📍 ${e.last_visit.label} · ${formatTime(e.last_visit.at)}` : "No visit marked yet"} · {e.visits_today} today
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2 pl-[52px]">
                      {e.status !== "off" && e.last_fix ? (
                        <button type="button" onClick={() => setSelectedId(e.user_id)} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50">Locate</button>
                      ) : null}
                      <Link href={`/tracking/${encodeURIComponent(e.user_id)}`} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">View day →</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-5">
            <TrackingMap people={people} selectedId={selectedId} onSelect={setSelectedId} fitKey={filter} className="h-[560px]" />
            {session ? (
              <ExportPanel token={session.token} title="Team report (Excel)" fileName="GreenCRM-team-field-report"
                path={(from, to) => `/team-tracking/export?from=${from}&to=${to}`} />
            ) : null}
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}
