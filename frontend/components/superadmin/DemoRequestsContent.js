"use client";

import { useMemo, useState } from "react";
import { apiRequest } from "../../lib/api";
import { formatDateTime, titleize } from "./format";
import { Badge, EmptyState, INPUT_CLASS, MetricCard, Notice, PageIntro, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "./ui";

function daysFromNow(d) { if (!d) return null; return Math.floor((new Date(d).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000); }
function dateLabel(d) { const diff = daysFromNow(d); if (diff === null) return ""; if (diff === 0) return "Today"; if (diff === 1) return "Tomorrow"; if (diff === -1) return "Yesterday"; if (diff > 1 && diff <= 7) return `In ${diff} days`; if (diff < -1 && diff >= -7) return `${Math.abs(diff)} days ago`; return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }); }
function ini(n = "?") { return String(n).split(" ").filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join("") || "?"; }

function NoteInput({ requestId, token, onSaved }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!note.trim()) return; setSaving(true);
    try { await apiRequest(`/demo-requests/${requestId}`, { method: "PATCH", token, body: { notes: note.trim() } }); setNote(""); onSaved?.(); }
    catch (_) {} finally { setSaving(false); }
  }
  return (
    <div className="flex gap-2 mt-2">
      <input className={`${INPUT_CLASS} text-xs`} value={note} onChange={e => setNote(e.target.value)} placeholder="Add note… (how was demo, next step)" onKeyDown={e => e.key === "Enter" && save()} />
      <button type="button" onClick={save} disabled={saving || !note.trim()} className="shrink-0 rounded-lg bg-brand-700 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-brand-800 disabled:opacity-50 transition">{saving ? "…" : "Save"}</button>
    </div>
  );
}

function DemoCard({ r, token, onStatusChange, updatingId, onRefresh }) {
  const isPending = r.status === "pending";
  const diff = daysFromNow(r.demo_date || r.created_at);
  const urgency = isPending && (diff === 0 || diff === 1) ? "bg-amber-50/60 ring-amber-200" : isPending ? "bg-white ring-slate-200" : "bg-white ring-slate-200 opacity-90";

  return (
    <div className={`rounded-[14px] p-4 ring-1 transition hover:ring-brand-200 ${urgency}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[11px] font-bold text-white ${isPending ? "bg-amber-500" : "bg-emerald-600"}`}>{ini(r.name)}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-slate-900">{r.name}</p>
              <Badge tone={isPending ? "amber" : "emerald"}>{titleize(r.status || "pending")}</Badge>
            </div>
            <p className="truncate text-[11px] text-slate-400">{r.company || "—"} · {r.email}{r.phone ? ` · ${r.phone}` : ""}{r.company_size ? ` · ${r.company_size}` : ""}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {r.demo_date ? <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-800">{dateLabel(r.demo_date)}</span> : null}
          <span className="text-[10px] text-slate-400">{dateLabel(r.created_at)}</span>
        </div>
      </div>

      {r.message ? <p className="mt-2 text-xs text-slate-600 line-clamp-2">{r.message}</p> : null}
      {r.notes ? <p className="mt-1.5 rounded-md bg-brand-50/60 px-2.5 py-1.5 text-[11px] text-brand-900 font-medium">📝 {r.notes}</p> : null}

      <div className="mt-2.5 flex items-center justify-between">
        <p className="text-[10px] text-slate-400">Requested {formatDateTime(r.created_at)}{r.demo_date ? ` · Demo: ${formatDateTime(r.demo_date)}` : ""}</p>
        <div className="flex gap-1.5">
          <a href={`mailto:${r.email}`} className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 transition">Email</a>
          {isPending ? (
            <button type="button" onClick={() => onStatusChange(r, "reviewed")} disabled={updatingId === String(r.id)} className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-50">{updatingId === String(r.id) ? "…" : "✓ Reviewed"}</button>
          ) : (
            <button type="button" onClick={() => onStatusChange(r, "pending")} disabled={updatingId === String(r.id)} className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 transition disabled:opacity-50">{updatingId === String(r.id) ? "…" : "Reopen"}</button>
          )}
        </div>
      </div>
      <NoteInput requestId={r.id} token={token} onSaved={onRefresh} />
    </div>
  );
}

export default function DemoRequestsContent({ session, data, error, loading, refresh }) {
  const requests = data.requests?.items || [];
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState("");
  const [notice, setNotice] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter(r => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return [r.name, r.email, r.company, r.phone, r.message, r.notes].filter(Boolean).some(v => String(v).toLowerCase().includes(q));
    });
  }, [query, requests, statusFilter]);

  // Group: Upcoming (demo_date future/today), Recent (past 7 days), Older
  const groups = useMemo(() => {
    const upcoming = [], recent = [], older = [];
    const sorted = [...filtered].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    sorted.forEach(r => {
      const demoDiff = daysFromNow(r.demo_date);
      const createdDiff = daysFromNow(r.created_at);
      if (demoDiff !== null && demoDiff >= 0) upcoming.push(r);
      else if (createdDiff !== null && createdDiff >= -7) recent.push(r);
      else older.push(r);
    });
    // Sort upcoming by demo_date ascending
    upcoming.sort((a, b) => new Date(a.demo_date) - new Date(b.demo_date));
    return { upcoming, recent, older };
  }, [filtered]);

  const pending = requests.filter(r => r.status === "pending").length;
  const reviewed = requests.filter(r => r.status !== "pending").length;

  async function handleStatus(r, status) {
    setUpdatingId(String(r.id)); setNotice(null);
    try { await apiRequest(`/demo-requests/${r.id}`, { method: "PATCH", token: session.token, body: { status } }); setNotice({ tone: "success", text: `${r.name} → ${status}` }); await refresh(); }
    catch (err) { setNotice({ tone: "error", text: err.message }); } finally { setUpdatingId(""); }
  }

  if (loading) return <Notice tone="info" text="Loading demos…" />;

  return (
    <div className="tw-buttons min-w-0 space-y-4 pb-10">
      <Notice tone="error" text={error} />
      {notice ? <Notice tone={notice.tone} text={notice.text} /> : null}

      <PageIntro title="Demo requests" description="People who asked to see GreenCRM. Reply, add a note after the call, and mark them reviewed." meta={<><Badge tone="amber">{pending} pending</Badge><Badge tone="emerald">{reviewed} reviewed</Badge><Badge>{requests.length} total</Badge></>} />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Waiting for a reply" value={pending} note="Pending requests" tone="amber" />
        <MetricCard label="Demos coming up" value={groups.upcoming.length} note="Today or later" tone="teal" />
        <MetricCard label="Reviewed" value={reviewed} note="Done or replied" tone="emerald" />
        <MetricCard label="Last 7 days" value={groups.recent.length + groups.upcoming.filter((r) => daysFromNow(r.created_at) >= -7).length} note={`${requests.length} requests in total`} tone="blue" />
      </div>

      {/* Filters */}
      <div className="grid items-center gap-2 rounded-[14px] bg-white p-3 ring-1 ring-slate-200 sm:grid-cols-[minmax(0,1fr)_170px_auto]">
        <input className={INPUT_CLASS} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, company, email…" />
        <select className={INPUT_CLASS} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
        </select>
        <span className="text-[12px] text-slate-500 sm:text-right">{filtered.length} shown</span>
      </div>

      {/* Upcoming Demos */}
      {groups.upcoming.length ? (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-brand-600 animate-pulse" />
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-700">Upcoming Demos ({groups.upcoming.length})</p>
          </div>
          <div className="space-y-2">
            {groups.upcoming.map(r => <DemoCard key={r.id} r={r} token={session.token} onStatusChange={handleStatus} updatingId={updatingId} onRefresh={refresh} />)}
          </div>
        </div>
      ) : null}

      {/* Recent */}
      {groups.recent.length ? (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 mb-2">Recent — Last 7 Days ({groups.recent.length})</p>
          <div className="space-y-2">
            {groups.recent.map(r => <DemoCard key={r.id} r={r} token={session.token} onStatusChange={handleStatus} updatingId={updatingId} onRefresh={refresh} />)}
          </div>
        </div>
      ) : null}

      {/* Older */}
      {groups.older.length ? (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 mb-2">Older ({groups.older.length})</p>
          <div className="space-y-2">
            {groups.older.map(r => <DemoCard key={r.id} r={r} token={session.token} onStatusChange={handleStatus} updatingId={updatingId} onRefresh={refresh} />)}
          </div>
        </div>
      ) : null}

      {!filtered.length ? <EmptyState icon="demo" title="No demos found" description="Try different search or filter." /> : null}
    </div>
  );
}
