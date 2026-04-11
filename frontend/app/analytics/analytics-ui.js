"use client";

import Link from "next/link";

import DashboardIcon from "../../components/dashboard/icons";
import { STATUS_TONE, WORKFLOW_TONE, compact, money, titleize, when } from "./analytics-utils";

const PANEL = "rounded-[30px] border border-[#eadfcd] bg-white/84 p-5 shadow-[0_14px_36px_rgba(79,58,22,0.06)] md:p-6";
const HERO = "rounded-[36px] border border-[#eadfcd] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(250,241,221,0.98)_44%,_rgba(245,231,193,0.98)_100%)] p-6 shadow-[0_24px_70px_rgba(79,58,22,0.08)] md:p-8";
const KICKER = "text-[10px] font-black uppercase tracking-[0.28em] text-[#9a886d]";
const BUTTON = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#eadfcd] bg-white px-4 py-2.5 text-sm font-semibold text-[#5d503c] transition hover:-translate-y-0.5 hover:text-[#060710]";
const PRIMARY = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#d7b258] bg-[#f3dfab] px-4 py-2.5 text-sm font-semibold text-[#060710] shadow-[0_16px_30px_rgba(203,169,82,0.18)] transition hover:-translate-y-0.5 hover:bg-[#efd48f]";

function TonePill({ active, tone, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-bold ring-1 transition ${tone} ${active ? "scale-[1.02] shadow-[0_10px_20px_rgba(79,58,22,0.08)]" : "opacity-75 hover:opacity-100"}`}
    >
      {children}
    </button>
  );
}

function TrendChart({ trend }) {
  const max = Math.max(...trend.map((item) => item.value || item.leads || 0), 1);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {trend.map((item) => (
          <div key={item.label} className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className={KICKER}>{item.label}</p>
                <p className="mt-2 text-xl font-black text-[#060710]">{compact(item.leads)}</p>
              </div>
              <span className="text-xs font-semibold text-[#8f816a]">{money(item.value)}</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#efe6d7]">
              <span className="block h-full rounded-full bg-[linear-gradient(90deg,#d7b258_0%,#f0d58a_100%)]" style={{ width: `${Math.max(12, Math.round(((item.value || item.leads || 0) / max) * 100))}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-[#7f7059]">
              <span>{compact(item.closed)} closed</span>
              <span>{item.leads ? Math.round((item.closed / item.leads) * 100) : 0}% win</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SourceDonut({ sourceMix }) {
  const total = sourceMix.reduce((sum, item) => sum + item.value, 0);
  let cursor = 0;
  const gradient = sourceMix
    .map((item) => {
      const start = cursor;
      cursor += total ? (item.value / total) * 360 : 0;
      return `${item.color} ${start}deg ${cursor}deg`;
    })
    .join(", ");

  return (
    <div className="grid gap-5 lg:grid-cols-[220px_1fr] lg:items-center">
      <div className="mx-auto grid h-[220px] w-[220px] place-items-center rounded-full border border-[#eadfcd] bg-white shadow-[0_16px_34px_rgba(79,58,22,0.08)]" style={{ background: gradient ? `conic-gradient(${gradient})` : "#f3ede2" }}>
        <div className="grid h-[138px] w-[138px] place-items-center rounded-full border border-[#eadfcd] bg-white text-center shadow-[inset_0_2px_16px_rgba(79,58,22,0.05)]">
          <strong className="text-3xl font-black text-[#060710]">{compact(total)}</strong>
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8f816a]">sources</span>
        </div>
      </div>
      <div className="space-y-3">
        {sourceMix.length ? sourceMix.map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-3 rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ background: item.color }} />
              <strong className="text-sm text-[#060710]">{item.label}</strong>
            </div>
            <span className="text-sm font-bold text-[#8d6e27]">{compact(item.value)}</span>
          </div>
        )) : <div className="rounded-[22px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-4 py-10 text-center text-sm text-[#7a6b57]">No source data in this range.</div>}
      </div>
    </div>
  );
}

function LeadCard({ lead }) {
  return (
    <div className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4 shadow-[0_10px_24px_rgba(79,58,22,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-[#060710]">{lead.company_name || "Untitled lead"}</p>
          <p className="mt-1 text-sm text-[#746853]">{lead.contact_person || "No contact"}{lead.assigned_to_name ? ` · ${lead.assigned_to_name}` : ""}</p>
        </div>
        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${STATUS_TONE[lead.status] || "bg-[#f4efe5] text-[#6f614c] ring-[#e6dccb]"}`}>{titleize(lead.status || "new")}</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 text-sm">
        <div><p className={KICKER}>Workflow</p><p className="mt-2 font-semibold text-[#060710]">{titleize(lead.workflow_stage || "sales")}</p></div>
        <div><p className={KICKER}>Source</p><p className="mt-2 font-semibold text-[#060710]">{titleize(lead.lead_source || "direct")}</p></div>
        <div><p className={KICKER}>Value</p><p className="mt-2 font-semibold text-[#060710]">{money(lead.estimated_value)}</p></div>
        <div><p className={KICKER}>Follow-up</p><p className="mt-2 font-semibold text-[#060710]">{when(lead.follow_up_date, true)}</p></div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${WORKFLOW_TONE[lead.workflow_stage || "sales"] || "bg-[#f4efe5] text-[#6f614c] ring-[#e6dccb]"}`}>Workflow {titleize(lead.workflow_stage || "sales")}</span>
        <Link href={`/leads/${lead.lead_id}`} className={BUTTON}>Open Lead</Link>
      </div>
    </div>
  );
}

export function AnalyticsWorkspace({
  deck,
  focusDeck,
  range,
  statusFocus,
  workflowFocus,
  filters,
  loading,
  error,
  onRangeChange,
  onRefresh,
  onExport,
  onStatusFocus,
  onWorkflowFocus,
  onFilterChange,
  onResetFilters,
}) {
  return (
    <div className="mx-auto grid max-w-[1320px] gap-5">
      {error ? <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}
      <section className={HERO}>
        <div className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr] xl:items-start">
          <div className="space-y-5">
            <div>
              <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">Analytics Desk</span>
              <h2 className="mt-4 text-[2.2rem] font-semibold tracking-tight text-[#060710] md:text-[3.2rem] md:leading-[1.02]">Track pipeline health, source mix, and team performance in real time.</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[#746853] md:text-base">Filter by status, owner, source, and time range to uncover what is moving your pipeline forward.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {deck.topCards.map((item) => <div key={item.label} className="rounded-[22px] border border-[#eadfcd] bg-white/82 px-4 py-4 shadow-[0_10px_24px_rgba(79,58,22,0.05)]"><p className={KICKER}>{item.label}</p><strong className="mt-2 block text-xl font-black text-[#060710]">{item.value}</strong><span className="mt-1 block text-xs text-[#8f816a]">{item.hint}</span></div>)}
            </div>
          </div>
          <div className="space-y-4 xl:justify-self-end xl:w-full xl:max-w-[520px]">
            <div className="flex flex-wrap gap-2">
              {["week", "month", "quarter", "year"].map((item) => <button key={item} type="button" onClick={() => onRangeChange(item)} className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] transition ${range === item ? "bg-[#10111d] text-white shadow-[0_16px_30px_rgba(6,7,16,0.2)]" : "border border-[#eadfcd] bg-white/88 text-[#7c6d55]"}`}>{titleize(item)}</button>)}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={onRefresh} className={BUTTON}><DashboardIcon name="analytics" className="h-4 w-4" />Refresh</button>
              <button type="button" onClick={onExport} className={PRIMARY}><DashboardIcon name="documents" className="h-4 w-4" />Export CSV</button>
            </div>
            <div className="rounded-[28px] border border-[#eadfcd] bg-white/84 p-4 shadow-[0_12px_30px_rgba(79,58,22,0.06)]">
              <p className={KICKER}>Focus Filters</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {deck.statusMix.map((item) => <TonePill key={item.key} active={statusFocus === item.key} tone={item.tone} onClick={() => onStatusFocus(item.key)}>{item.label} · {compact(item.value)}</TonePill>)}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {deck.workflowMix.map((item) => <TonePill key={item.key} active={workflowFocus === item.key} tone={item.tone} onClick={() => onWorkflowFocus(item.key)}>{item.label} · {compact(item.value)}</TonePill>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {loading ? <div className="grid min-h-[320px] place-items-center rounded-[30px] border border-[#eadfcd] bg-white/80 text-sm text-[#7a6b57]">Loading analytics workspace...</div> : (
        <>
          <article className={PANEL}>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className={KICKER}>Advanced Filters</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Slice the pipeline the way you want</h3>
              </div>
              <button type="button" onClick={onResetFilters} className={BUTTON}>Reset Filters</button>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <label className="space-y-2">
                <span className={KICKER}>Search</span>
                <input className="w-full rounded-[18px] border border-[#eadfcd] bg-white px-4 py-3 text-sm text-[#060710] outline-none placeholder:text-[#9c8e76] focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]" value={filters.query} onChange={(event) => onFilterChange("query", event.target.value)} placeholder="Lead, owner, source, product" />
              </label>
              <label className="space-y-2">
                <span className={KICKER}>Owner</span>
                <select className="w-full rounded-[18px] border border-[#eadfcd] bg-white px-4 py-3 text-sm text-[#060710] outline-none focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]" value={filters.owner} onChange={(event) => onFilterChange("owner", event.target.value)}>
                  <option value="all">All owners</option>
                  {deck.filterOptions.owners.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="space-y-2">
                <span className={KICKER}>Priority</span>
                <select className="w-full rounded-[18px] border border-[#eadfcd] bg-white px-4 py-3 text-sm text-[#060710] outline-none focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]" value={filters.priority} onChange={(event) => onFilterChange("priority", event.target.value)}>
                  <option value="all">All priority</option>
                  {deck.filterOptions.priorities.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="space-y-2">
                <span className={KICKER}>Source</span>
                <select className="w-full rounded-[18px] border border-[#eadfcd] bg-white px-4 py-3 text-sm text-[#060710] outline-none focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]" value={filters.source} onChange={(event) => onFilterChange("source", event.target.value)}>
                  <option value="all">All sources</option>
                  {deck.filterOptions.sources.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="space-y-2">
                <span className={KICKER}>Product</span>
                <select className="w-full rounded-[18px] border border-[#eadfcd] bg-white px-4 py-3 text-sm text-[#060710] outline-none focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]" value={filters.product} onChange={(event) => onFilterChange("product", event.target.value)}>
                  <option value="all">All products</option>
                  {deck.filterOptions.products.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
            </div>
          </article>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {deck.kpis.map((item) => <article key={item.label} className={PANEL}><div className="flex items-start justify-between gap-4"><div><p className={KICKER}>{item.label}</p><h3 className="mt-2 text-[1.9rem] font-black leading-none text-[#060710]">{item.value}</h3><p className="mt-2 text-xs text-[#8f816a]">{item.hint}</p></div><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#fff4d9] text-[#8d6e27]"><DashboardIcon name={item.icon} className="h-5 w-5" /></div></div></article>)}
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
            <article className={PANEL}><p className={KICKER}>Revenue Pulse</p><h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Lead movement and closed value</h3><div className="mt-5"><TrendChart trend={deck.trend} /></div></article>
            <article className={PANEL}><p className={KICKER}>Source Mix</p><h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Where pipeline is entering from</h3><div className="mt-5"><SourceDonut sourceMix={deck.sourceMix} /></div></article>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.06fr_0.94fr] xl:items-start">
            <article className={PANEL}>
              <div className="flex items-start justify-between gap-4"><div><p className={KICKER}>Deep Lead View</p><h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">What is happening inside the focused pipeline</h3></div><span className="inline-flex rounded-full border border-[#eadfcd] bg-[#fffaf1] px-3 py-1 text-[11px] font-bold text-[#7c6d55]">{titleize(statusFocus)} · {titleize(workflowFocus)}</span></div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{focusDeck.metrics.map((item) => <div key={item.label} className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4"><p className={KICKER}>{item.label}</p><strong className="mt-3 block text-xl font-black text-[#060710]">{item.value}</strong></div>)}</div>
              <div className="mt-5 space-y-4">{focusDeck.leads.length ? focusDeck.leads.slice(0, 6).map((lead) => <LeadCard key={lead.lead_id} lead={lead} />) : <div className="rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-12 text-center text-sm text-[#7a6b57]">No leads matched the current deep focus.</div>}</div>
            </article>

            <div className="space-y-5">
              <article className={PANEL}><p className={KICKER}>Owner Board</p><h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Who is holding visible pipeline</h3><div className="mt-5 space-y-3">{deck.ownerBoard.length ? deck.ownerBoard.map((item) => <div key={item.label} className="flex items-center justify-between gap-3 rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-3"><div><strong className="block text-sm text-[#060710]">{item.label}</strong><span className="mt-1 block text-xs text-[#8f816a]">{compact(item.leads)} leads</span></div><span className="text-sm font-bold text-[#8d6e27]">{money(item.value)}</span></div>) : <div className="rounded-[22px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-4 py-10 text-center text-sm text-[#7a6b57]">No ownership load yet.</div>}</div></article>
              <article className={PANEL}><p className={KICKER}>Recent Activity</p><h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Latest signals from the workspace</h3><div className="mt-5 space-y-3">{deck.recent.length ? deck.recent.slice(0, 6).map((item) => <div key={item.activity_id} className="flex gap-3 rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-[#8d6e27]"><DashboardIcon name="message" className="h-4 w-4" /></div><div className="min-w-0 flex-1"><strong className="block truncate text-sm text-[#060710]">{item.company_name || "Activity"}</strong><p className="mt-1 text-sm leading-6 text-[#6f614c]">{item.message || "No message available."}</p></div><span className="text-xs font-semibold text-[#8f816a]">{when(item.created_at, true)}</span></div>) : <div className="rounded-[22px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-4 py-10 text-center text-sm text-[#7a6b57]">No recent activity available.</div>}</div></article>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
