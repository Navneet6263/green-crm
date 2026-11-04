"use client";

import { AnalyticsHeader } from "./AnalyticsHeader";
import { FocusPanel, RecentActivity } from "./AnalyticsPanels";
import { OwnerTable, SourceDonut, StageFlow, StatusFunnel, TrendChart } from "../pipeline/PipelineCharts";

function Panel({ title, hint, right, children, className = "" }) {
  return (
    <section className={`min-w-0 rounded-[14px] bg-white px-5 py-4 ring-1 ring-slate-200 ${className}`}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[14px] font-bold text-slate-900">{title}</h3>
          {hint ? <p className="text-[12px] text-slate-500">{hint}</p> : null}
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

const Legend = ({ items }) => (
  <span className="flex gap-3 text-[12px] text-slate-500">
    {items.map(([name, color]) => <span key={name} className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: color }} />{name}</span>)}
  </span>
);

/** The Insights tab: filters and headline numbers, the trend, where leads come from, where they are, and who has them. */
export function AnalyticsWorkspace({
  deck, focusDeck, range, statusFocus, workflowFocus, filters,
  loading, focusLoading, error, onRangeChange, onRefresh,
  onStatusFocus, onWorkflowFocus, onFilterChange, onResetFilters,
}) {
  const total = deck.totals?.leads || 0;
  return (
    <div className="min-w-0 space-y-4">
      {error ? <div role="alert" className="rounded-[12px] bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-700 ring-1 ring-rose-200">{error}</div> : null}

      <AnalyticsHeader deck={deck} range={range} filters={filters} loading={loading}
        onRangeChange={onRangeChange} onRefresh={onRefresh} onFilterChange={onFilterChange} onResetFilters={onResetFilters} />

      {loading ? (
        <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">{[0, 1, 2, 3].map((i) => <div key={i} className="h-64 animate-pulse rounded-[14px] bg-white ring-1 ring-slate-200" />)}</div>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
            <Panel title="Leads over time" hint={deck.series?.[0]?.unit ? `Per ${deck.series[0].unit}, by the day the lead was created` : "Per day, by the day the lead was created"}
              right={<Legend items={[["Leads", "#009a8c"], ["Won", "#3b6fd8"]]} />}>
              <TrendChart series={deck.series || []} />
            </Panel>
            <Panel title="Lead sources" hint="Where the leads came from">
              <SourceDonut items={deck.sourceMix} />
            </Panel>
          </div>

          <Panel title="Workflow stage" hint="Where the leads are now: sales, then legal and finance after the deal is won">
            <StageFlow items={deck.workflowMix} />
          </Panel>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <Panel title="By status" hint="In pipeline order, with share of all leads">
              <StatusFunnel items={deck.statusMix} total={total} />
            </Panel>
            <Panel title="People" hint="Owners ranked by leads in the period">
              <OwnerTable owners={deck.ownerBoard} />
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
            <FocusPanel focusDeck={focusDeck} statusFocus={statusFocus} workflowFocus={workflowFocus} loading={focusLoading}
              deck={deck} onStatusFocus={onStatusFocus} onWorkflowFocus={onWorkflowFocus} />
            <RecentActivity recent={deck.recent} />
          </div>
        </>
      )}
    </div>
  );
}
