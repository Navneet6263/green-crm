"use client";

const K = "text-[10px] font-bold uppercase tracking-widest text-slate-400";
const PANEL = "rounded-2xl border border-slate-100 bg-white shadow-sm px-5 py-5";

function nice(v) {
  return String(v || "--").replace(/[-_]+/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

export function LeadHistorySidebar({ stageRows, sourceRows, latestLead, filteredLeads, formatDate }) {
  return (
    <div className="space-y-4">
      {/* Stage pulse */}
      <div className={PANEL}>
        <p className={K}>Stage Pulse</p>
        <h3 className="mt-0.5 mb-4 text-sm font-bold text-slate-900">Workflow pressure</h3>
        {stageRows.length ? (
          <div className="space-y-2.5">
            {stageRows.map(([stage, count]) => {
              const pct = Math.max(12, Math.round((count / Math.max(filteredLeads.length, 1)) * 100));
              const colors = { sales:"bg-amber-400", legal:"bg-violet-400", finance:"bg-orange-400", completed:"bg-emerald-500" };
              return (
                <div key={stage}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700">{nice(stage)}</span>
                    <span className="text-xs font-bold text-amber-700">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${colors[stage] || "bg-amber-400"} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : <p className="text-xs text-slate-400">No workflow data on this page.</p>}
      </div>

      {/* Source watch */}
      <div className={PANEL}>
        <p className={K}>Source Watch</p>
        <h3 className="mt-0.5 mb-4 text-sm font-bold text-slate-900">Acquisition mix</h3>
        <div className="flex flex-wrap gap-2">
          {sourceRows.length ? sourceRows.map(([src, cnt]) => (
            <span key={src} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              {nice(src)} · {cnt}
            </span>
          )) : <p className="text-xs text-slate-400">No source data on this page.</p>}
        </div>
      </div>

      {/* Latest move */}
      <div className={PANEL}>
        <p className={K}>Latest Move</p>
        <h3 className="mt-0.5 mb-3 text-sm font-bold text-slate-900">Most recent update</h3>
        {latestLead ? (
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
            <p className="text-sm font-bold text-slate-900">{latestLead.company_name || latestLead.contact_person || "Lead"}</p>
            <p className="mt-0.5 text-xs text-amber-700">{nice(latestLead.status)}</p>
            <p className="mt-1 text-xs text-slate-400">{formatDate(latestLead.updated_at || latestLead.created_at, true)}</p>
          </div>
        ) : <p className="text-xs text-slate-400">No lead activity loaded.</p>}
      </div>
    </div>
  );
}
