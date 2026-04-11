"use client";

import Link from "next/link";

import DashboardIcon from "../../components/dashboard/icons";
import { API_BASE } from "../../lib/api";
import {
  PRIORITY_TONE,
  STATUS_TONE,
  WORKFLOW_TONE,
  compact,
  formatDuration,
  money,
  titleize,
  when,
} from "./workflow-utils";

const PANEL = "rounded-[30px] border border-[#eadfcd] bg-white/84 p-5 shadow-[0_14px_36px_rgba(79,58,22,0.06)] md:p-6";
const HERO = "rounded-[36px] border border-[#eadfcd] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(250,241,221,0.98)_44%,_rgba(245,231,193,0.98)_100%)] p-6 shadow-[0_24px_70px_rgba(79,58,22,0.08)] md:p-8";
const KICKER = "text-[10px] font-black uppercase tracking-[0.28em] text-[#9a886d]";
const INPUT = "w-full rounded-[18px] border border-[#eadfcd] bg-white px-4 py-3 text-sm text-[#060710] outline-none placeholder:text-[#9c8e76] focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]";
const BUTTON = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#eadfcd] bg-white px-4 py-2.5 text-sm font-semibold text-[#5d503c] transition hover:-translate-y-0.5 hover:text-[#060710]";

function LeadQueueCard({ lead, active, onSelect }) {
  const owner = lead.assigned_to_name || lead.legal_owner_name || lead.finance_owner_name || "Unassigned";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-[28px] border p-4 text-left transition ${
        active
          ? "border-[#d7b258] bg-[#fff8e9] shadow-[0_16px_32px_rgba(203,169,82,0.14)]"
          : "border-[#eadfcd] bg-white/88 shadow-[0_10px_24px_rgba(79,58,22,0.05)] hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(79,58,22,0.08)]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-lg font-semibold text-[#060710]">{lead.company_name || "Untitled lead"}</h4>
          <p className="mt-1 text-sm text-[#746853]">{lead.contact_person || "No contact"} | {owner}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${STATUS_TONE[lead.status] || "bg-[#f4efe5] text-[#6f614c] ring-[#e6dccb]"}`}>{titleize(lead.status || "new")}</span>
          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${WORKFLOW_TONE[lead.workflow_stage || "sales"] || "bg-[#f4efe5] text-[#6f614c] ring-[#e6dccb]"}`}>{titleize(lead.workflow_stage || "sales")}</span>
        </div>
      </div>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <div><p className={KICKER}>Value</p><p className="mt-2 font-semibold text-[#060710]">{money(lead.invoice_amount || lead.estimated_value)}</p></div>
        <div><p className={KICKER}>Docs</p><p className="mt-2 font-semibold text-[#060710]">{compact(lead.doc_count || 0)}</p></div>
        <div><p className={KICKER}>Source</p><p className="mt-2 font-semibold text-[#060710]">{titleize(lead.lead_source || "unknown")}</p></div>
        <div><p className={KICKER}>Follow-up</p><p className="mt-2 font-semibold text-[#060710]">{when(lead.follow_up_date, true)}</p></div>
      </div>
    </button>
  );
}

function TimelineBlock({ title, items, empty, renderMeta }) {
  return (
    <article className={PANEL}>
      <p className={KICKER}>{title}</p>
      <div className="mt-5 space-y-3">
        {items.length ? items.map((item, index) => (
          <div key={`${title}-${index}`} className="flex gap-3 rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
            <div className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-[#8d6e27]">
              <DashboardIcon name="workflow" className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#060710]">{item.title}</strong>
              <p className="mt-1 text-sm leading-6 text-[#6f614c]">{item.copy}</p>
              <span className="mt-2 block text-xs font-semibold text-[#8f816a]">{renderMeta(item)}</span>
            </div>
          </div>
        )) : (
          <div className="rounded-[22px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-4 py-10 text-center text-sm text-[#7a6b57]">{empty}</div>
        )}
      </div>
    </article>
  );
}

export function WorkflowWorkspaceView({
  deck,
  pagedLeads,
  currentPage,
  totalPages,
  filters,
  selectedLead,
  selectedId,
  analysis,
  loading,
  detailLoading,
  error,
  onSelectLead,
  onPageChange,
  onRefresh,
  onFilterChange,
  onResetFilters,
}) {
  const owner = selectedLead?.assigned_to_name || selectedLead?.legal_owner_name || selectedLead?.finance_owner_name || "Unassigned";
  const docs = selectedLead ? [...(selectedLead.legal_documents || []), ...(selectedLead.finance_documents || [])].slice(0, 6) : [];
  const stageHistory = (selectedLead?.stage_history || []).map((item) => ({
    title: titleize(item.stage || "sales"),
    copy: item.exited_at ? `Entered ${when(item.entered_at, true)} and exited ${when(item.exited_at, true)}.` : `Entered ${when(item.entered_at, true)} and still active in this stage.`,
    meta: formatDuration(item.duration),
  }));
  const transferTrail = (selectedLead?.transfer_history || []).map((item) => ({
    title: `${titleize(item.from_stage)} -> ${titleize(item.to_stage)}`,
    copy: `${item.transferred_by_name || "Team"} assigned ${item.transferred_to_name || "next workflow owner"}${item.notes ? ` | ${item.notes}` : ""}`,
    meta: when(item.transferred_at, true),
  }));

  return (
    <div className="mx-auto grid max-w-[1320px] gap-5">
      {error ? <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}
      <section className={HERO}>
        <div className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr] xl:items-start">
          <div className="space-y-5">
            <div>
              <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">Workflow Desk</span>
              <h2 className="mt-4 text-[2.2rem] font-semibold tracking-tight text-[#060710] md:text-[3.2rem] md:leading-[1.02]">Track lead movement across sales, legal, and finance stages.</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[#746853] md:text-base">Monitor ownership transfers, document uploads, and stage progress for every active lead.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {deck.topCards.map((item) => <div key={item.label} className="rounded-[22px] border border-[#eadfcd] bg-white/82 px-4 py-4 shadow-[0_10px_24px_rgba(79,58,22,0.05)]"><p className={KICKER}>{item.label}</p><strong className="mt-2 block text-xl font-black text-[#060710]">{item.value}</strong><span className="mt-1 block text-xs text-[#8f816a]">{item.hint}</span></div>)}
            </div>
          </div>
          <div className="space-y-4 xl:justify-self-end xl:w-full xl:max-w-[520px]">
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={onRefresh} className={BUTTON}><DashboardIcon name="analytics" className="h-4 w-4" />Refresh Queue</button>
              <Link href="/leads" className={BUTTON}><DashboardIcon name="leads" className="h-4 w-4" />Open Leads</Link>
            </div>
            <div className="rounded-[28px] border border-[#eadfcd] bg-white/84 p-4 shadow-[0_12px_30px_rgba(79,58,22,0.06)]">
              <p className={KICKER}>Advanced Filters</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <input className={INPUT} value={filters.query} onChange={(event) => onFilterChange("query", event.target.value)} placeholder="Search lead, owner, source, company" />
                <select className={INPUT} value={filters.stage} onChange={(event) => onFilterChange("stage", event.target.value)}><option value="all">All stages</option>{deck.stageMix.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
                <select className={INPUT} value={filters.status} onChange={(event) => onFilterChange("status", event.target.value)}><option value="all">All status</option>{deck.statusMix.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
                <select className={INPUT} value={filters.owner} onChange={(event) => onFilterChange("owner", event.target.value)}><option value="all">All owners</option>{deck.filterOptions.owners.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
                <select className={INPUT} value={filters.priority} onChange={(event) => onFilterChange("priority", event.target.value)}><option value="all">All priority</option>{deck.filterOptions.priorities.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
                <select className={INPUT} value={filters.source} onChange={(event) => onFilterChange("source", event.target.value)}><option value="all">All sources</option>{deck.filterOptions.sources.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
              </div>
              <button type="button" onClick={onResetFilters} className="mt-3 text-xs font-bold uppercase tracking-[0.24em] text-[#8d6e27]">Reset filters</button>
            </div>
          </div>
        </div>
      </section>

      {loading ? <div className="grid min-h-[320px] place-items-center rounded-[30px] border border-[#eadfcd] bg-white/80 text-sm text-[#7a6b57]">Loading workflow desk...</div> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {deck.kpis.map((item) => <article key={item.label} className={PANEL}><p className={KICKER}>{item.label}</p><h3 className="mt-2 text-[1.9rem] font-black leading-none text-[#060710]">{item.value}</h3><p className="mt-2 text-xs text-[#8f816a]">{item.hint}</p></article>)}
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.04fr_0.96fr] xl:items-start">
            <article className={PANEL}>
              <div className="flex items-start justify-between gap-4">
                <div><p className={KICKER}>Tracked Queue</p><h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Workflow leads</h3></div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className="inline-flex rounded-full border border-[#eadfcd] bg-[#fffaf1] px-3 py-1 text-[11px] font-bold text-[#7c6d55]">{compact(deck.filteredLeads.length)} visible</span>
                  <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#8d6e27]">Page {currentPage} of {totalPages}</span>
                </div>
              </div>
              <div className="mt-5 space-y-4">
                {deck.filteredLeads.length ? pagedLeads.map((lead) => <LeadQueueCard key={lead.lead_id} lead={lead} active={selectedId === lead.lead_id} onSelect={() => onSelectLead(lead.lead_id)} />) : <div className="rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-12 text-center text-sm text-[#7a6b57]">No workflow leads matched the current filters.</div>}
              </div>
              {deck.filteredLeads.length ? (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                  <div>
                    <p className={KICKER}>Queue Paging</p>
                    <p className="mt-2 text-sm font-semibold text-[#060710]">10 leads per page</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage <= 1} className={`${BUTTON} disabled:cursor-not-allowed disabled:opacity-50`}>Previous</button>
                    <button type="button" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages} className={`${BUTTON} disabled:cursor-not-allowed disabled:opacity-50`}>Next</button>
                  </div>
                </div>
              ) : null}
            </article>

            <div className="space-y-5">
              {selectedLead ? (
                <>
                  <article className={PANEL}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className={KICKER}>Selected Lead</p>
                        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">{selectedLead.company_name || "Untitled lead"}</h3>
                        <p className="mt-2 text-sm leading-7 text-[#6f614c]">{selectedLead.contact_person || "No contact"} | {owner} | {selectedLead.email || "No email"}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${STATUS_TONE[selectedLead.status] || "bg-[#f4efe5] text-[#6f614c] ring-[#e6dccb]"}`}>{titleize(selectedLead.status || "new")}</span>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${WORKFLOW_TONE[selectedLead.workflow_stage || "sales"] || "bg-[#f4efe5] text-[#6f614c] ring-[#e6dccb]"}`}>{titleize(selectedLead.workflow_stage || "sales")}</span>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${PRIORITY_TONE[selectedLead.priority] || "bg-[#f4efe5] text-[#6f614c] ring-[#e6dccb]"}`}>{titleize(selectedLead.priority || "medium")}</span>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {analysis.metrics.map((item) => <div key={item.label} className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4"><p className={KICKER}>{item.label}</p><strong className="mt-3 block text-base text-[#060710]">{item.value}</strong></div>)}
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4"><p className={KICKER}>Customer Signal</p><p className="mt-3 text-sm leading-7 text-[#5f533f]">{analysis.customerSignal}</p></div>
                      <div className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4"><p className={KICKER}>Fresh Notes</p><p className="mt-3 text-sm leading-7 text-[#5f533f]">{selectedLead.latest_note || "No latest note available yet."}</p></div>
                    </div>
                    {analysis.flags.length ? <div className="mt-5 flex flex-wrap gap-2">{analysis.flags.map((flag) => <span key={flag} className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#8d6e27]">{flag}</span>)}</div> : null}
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link href={`/leads/${selectedLead.lead_id}`} className={BUTTON}><DashboardIcon name="leads" className="h-4 w-4" />Open Lead</Link>
                      <Link href="/analytics" className={BUTTON}><DashboardIcon name="analytics" className="h-4 w-4" />Open Analytics</Link>
                    </div>
                  </article>

                  <article className={PANEL}>
                    <p className={KICKER}>Lead Breakdown</p>
                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4"><span className={KICKER}>Source</span><strong className="mt-3 block text-sm text-[#060710]">{titleize(selectedLead.lead_source || "unknown")}</strong></div>
                      <div className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4"><span className={KICKER}>Product</span><strong className="mt-3 block text-sm text-[#060710]">{selectedLead.product_name || "Not mapped"}</strong></div>
                      <div className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4"><span className={KICKER}>Value</span><strong className="mt-3 block text-sm text-[#060710]">{money(selectedLead.invoice_amount || selectedLead.estimated_value)}</strong></div>
                      <div className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4"><span className={KICKER}>Legal Owner</span><strong className="mt-3 block text-sm text-[#060710]">{selectedLead.legal_owner_name || "Unassigned"}</strong></div>
                      <div className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4"><span className={KICKER}>Finance Owner</span><strong className="mt-3 block text-sm text-[#060710]">{selectedLead.finance_owner_name || "Unassigned"}</strong></div>
                      <div className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4"><span className={KICKER}>Requirements</span><strong className="mt-3 block text-sm leading-6 text-[#060710]">{selectedLead.requirements || "No requirements captured"}</strong></div>
                    </div>
                  </article>

                  <TimelineBlock title="Stage History" items={stageHistory} empty="No stage history recorded yet." renderMeta={(item) => item.meta} />
                  <TimelineBlock title="Transfer Trail" items={transferTrail} empty="No transfer trail recorded yet." renderMeta={(item) => item.meta} />

                  <article className={PANEL}>
                    <p className={KICKER}>Documents</p>
                    <div className="mt-5 space-y-3">
                      {docs.length ? docs.map((doc, index) => <div key={`${doc.id || doc.file_name}-${index}`} className="flex items-center justify-between gap-3 rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4"><div><strong className="block text-sm text-[#060710]">{doc.file_name || "Document"}</strong><span className="mt-1 block text-xs text-[#8f816a]">{doc.uploaded_by_name || "Team"} | {when(doc.uploaded_at, true)}</span></div><a href={doc.file_url?.startsWith("http") ? doc.file_url : `${API_BASE}${doc.file_url || ""}`} target="_blank" rel="noreferrer" className={BUTTON}>Open</a></div>) : <div className="rounded-[22px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-4 py-10 text-center text-sm text-[#7a6b57]">No workflow documents uploaded yet.</div>}
                    </div>
                  </article>
                </>
              ) : <article className={PANEL}><p className={KICKER}>Selected Lead</p><div className="mt-5 rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-12 text-center text-sm text-[#7a6b57]">{detailLoading ? "Loading selected workflow lead..." : "Select a workflow lead to inspect stage pressure, transfer trail, doc gaps, and detailed movement."}</div></article>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
