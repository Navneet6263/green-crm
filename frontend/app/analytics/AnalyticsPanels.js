"use client";

import Link from "next/link";
import DashboardIcon from "../../components/dashboard/icons";
import { compact, money, titleize, when, STATUS_TONE, WORKFLOW_TONE } from "./analytics-utils";

const K = "text-[10px] font-bold uppercase tracking-widest text-slate-400";
const PANEL = "rounded-2xl border border-slate-100 bg-white shadow-sm px-5 py-5";

// ── Owner Board ───────────────────────────────────────────────────────────────
export function OwnerBoard({ ownerBoard }) {
  const maxLeads = Math.max(...ownerBoard.map(o => o.leads), 1);
  return (
    <div className={PANEL}>
      <p className={K}>Owner Board</p>
      <h3 className="mt-0.5 mb-4 text-base font-bold text-slate-900">Who holds the pipeline</h3>
      {ownerBoard.length ? (
        <div className="space-y-2.5">
          {ownerBoard.map((item, i) => (
            <div key={item.label} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
              <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs font-bold text-white ${["bg-amber-500","bg-emerald-600","bg-sky-600","bg-violet-600","bg-orange-500","bg-rose-500"][i%6]}`}>
                {item.label.slice(0,2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-slate-800">{item.label}</span>
                  <span className="text-xs font-bold text-amber-700">{money(item.value)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${Math.max(6, Math.round((item.leads/maxLeads)*100))}%` }} />
                </div>
              </div>
              <span className="shrink-0 text-xs font-bold text-slate-500">{item.leads}</span>
            </div>
          ))}
        </div>
      ) : <p className="text-sm text-slate-400">No ownership data yet.</p>}
    </div>
  );
}

// ── Focus Panel ───────────────────────────────────────────────────────────────
export function FocusPanel({ focusDeck, statusFocus, workflowFocus, deck, onStatusFocus, onWorkflowFocus }) {
  return (
    <div className={PANEL}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className={K}>Deep Focus</p>
          <h3 className="mt-0.5 text-base font-bold text-slate-900">Drill into a segment</h3>
        </div>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
          {titleize(statusFocus)} · {titleize(workflowFocus)}
        </span>
      </div>

      {/* Status pills */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {deck.statusMix.map(item => (
          <button key={item.key} type="button" onClick={() => onStatusFocus(item.key)}
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition ${item.tone} ${statusFocus === item.key ? "ring-2 ring-offset-1 ring-amber-300 scale-105" : "opacity-70 hover:opacity-100"}`}>
            {item.label} · {item.value}
          </button>
        ))}
      </div>
      {/* Workflow pills */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {deck.workflowMix.map(item => (
          <button key={item.key} type="button" onClick={() => onWorkflowFocus(item.key)}
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition ${item.tone} ${workflowFocus === item.key ? "ring-2 ring-offset-1 ring-amber-300 scale-105" : "opacity-70 hover:opacity-100"}`}>
            {item.label} · {item.value}
          </button>
        ))}
      </div>

      {/* Focus metrics */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {focusDeck.metrics.map(m => (
          <div key={m.label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
            <p className={K}>{m.label}</p>
            <p className="mt-0.5 text-lg font-bold text-slate-900">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Focus leads */}
      <div className="space-y-2">
        {focusDeck.leads.slice(0, 5).map(lead => (
          <div key={lead.lead_id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5 transition hover:border-amber-200">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{lead.company_name || "Untitled"}</p>
              <p className="truncate text-xs text-slate-400">{lead.contact_person || "—"}{lead.assigned_to_name ? ` · ${lead.assigned_to_name}` : ""}</p>
            </div>
            <span className="shrink-0 text-xs font-bold text-amber-700">{money(lead.estimated_value)}</span>
            <Link href={`/leads/${lead.lead_id}`} className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-amber-300 hover:text-amber-800">
              Open
            </Link>
          </div>
        ))}
        {!focusDeck.leads.length ? <p className="text-center text-sm text-slate-400 py-4">No leads matched this focus.</p> : null}
      </div>
    </div>
  );
}

// ── Recent Activity ───────────────────────────────────────────────────────────
export function RecentActivity({ recent }) {
  return (
    <div className={PANEL}>
      <p className={K}>Recent Activity</p>
      <h3 className="mt-0.5 mb-4 text-base font-bold text-slate-900">Latest workspace signals</h3>
      {recent.length ? (
        <div className="space-y-2">
          {recent.slice(0, 6).map(item => (
            <div key={item.activity_id} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-600">
                <DashboardIcon name="message" className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{item.company_name || "Activity"}</p>
                <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{item.message || "No message."}</p>
              </div>
              <span className="shrink-0 text-[11px] text-slate-400">{when(item.created_at, true)}</span>
            </div>
          ))}
        </div>
      ) : <p className="text-sm text-slate-400">No recent activity.</p>}
    </div>
  );
}
