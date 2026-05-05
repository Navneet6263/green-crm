"use client";

import { AnalyticsHeader } from "./AnalyticsHeader";
import { TrendChart, SourceDonut, MixBars } from "./AnalyticsCharts";
import { OwnerBoard, FocusPanel, RecentActivity } from "./AnalyticsPanels";

const PANEL = "rounded-2xl border border-slate-100 bg-white shadow-sm px-5 py-5";

export function AnalyticsWorkspace({
  deck, focusDeck, range, statusFocus, workflowFocus, filters,
  loading, error, onRangeChange, onRefresh, onExport,
  onStatusFocus, onWorkflowFocus, onFilterChange, onResetFilters,
}) {
  return (
    <div className="mx-auto max-w-[1320px] space-y-5 px-1">
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}

      <AnalyticsHeader
        deck={deck} range={range} filters={filters}
        onRangeChange={onRangeChange} onRefresh={onRefresh} onExport={onExport}
        onFilterChange={onFilterChange} onResetFilters={onResetFilters}
      />

      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-100 bg-white text-sm text-slate-400">
          Loading analytics…
        </div>
      ) : (
        <>
          {/* Row 1 — Trend + Source */}
          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div className={PANEL}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Revenue Pulse</p>
              <h3 className="mt-0.5 mb-5 text-base font-bold text-slate-900">Lead movement & closed value</h3>
              <TrendChart trend={deck.trend} />
            </div>
            <div className={PANEL}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Source Mix</p>
              <h3 className="mt-0.5 mb-5 text-base font-bold text-slate-900">Where pipeline enters from</h3>
              <SourceDonut sourceMix={deck.sourceMix} />
            </div>
          </div>

          {/* Row 2 — Status + Workflow mix bars */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div className={PANEL}>
              <MixBars items={deck.statusMix} title="Status Distribution" />
            </div>
            <div className={PANEL}>
              <MixBars items={deck.workflowMix} title="Workflow Stage Distribution" />
            </div>
          </div>

          {/* Row 3 — Focus + Owner + Activity */}
          <div className="grid gap-5 xl:grid-cols-[1fr_340px] xl:items-start">
            <FocusPanel
              focusDeck={focusDeck} statusFocus={statusFocus} workflowFocus={workflowFocus}
              deck={deck} onStatusFocus={onStatusFocus} onWorkflowFocus={onWorkflowFocus}
            />
            <div className="space-y-5">
              <OwnerBoard ownerBoard={deck.ownerBoard} />
              <RecentActivity recent={deck.recent} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
