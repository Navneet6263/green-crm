"use client";

export default function LeadListToolbar({
  backgroundSync, closedWonCount, ownershipLabel,
  pageRefreshing, setStatus, status, totalMatched, transferredCount,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-800">
          {totalMatched} leads
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-500">
          {ownershipLabel}
        </span>
        {pageRefreshing ? <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-600 animate-pulse">Updating…</span> : null}
        {backgroundSync ? <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-400 animate-pulse">Syncing…</span> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatus(status === "closed-won" ? "all" : "closed-won")}
          className={`rounded-full border px-3 py-1 text-[11px] font-bold transition ${
            status === "closed-won"
              ? "border-emerald-300 bg-emerald-100 text-emerald-800"
              : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-700"
          }`}
        >
          Closed Won · {closedWonCount}
        </button>
        <button
          type="button"
          onClick={() => setStatus(status === "transferred" ? "all" : "transferred")}
          className={`rounded-full border px-3 py-1 text-[11px] font-bold transition ${
            status === "transferred"
              ? "border-amber-300 bg-amber-100 text-amber-800"
              : "border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:text-amber-700"
          }`}
        >
          Transferred · {transferredCount}
        </button>
      </div>
    </div>
  );
}
