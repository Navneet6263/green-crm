"use client";

import { T, Pill, StageDot, STAGE_PILL, STATUS_PILL, PRIORITY_PILL } from "./workflow-tokens";
import { compact, money, titleize, when } from "./workflow-utils";

function LeadCard({ lead, active, onSelect }) {
  const owner = lead.assigned_to_name || lead.legal_owner_name || lead.finance_owner_name || "Unassigned";
  const stage = lead.workflow_stage || "sales";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border px-4 py-3.5 text-left transition ${
        active
          ? "border-amber-300 bg-amber-50 shadow-sm"
          : "border-slate-100 bg-white hover:border-amber-200 hover:bg-amber-50/40"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <StageDot stage={stage} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">{lead.company_name || "Untitled lead"}</p>
            <p className="truncate text-xs text-slate-400">{lead.contact_person || "No contact"} · {owner}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <Pill label={titleize(stage)} map={STAGE_PILL} />
          <Pill label={titleize(lead.status || "new")} map={STATUS_PILL} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
        <span><span className="font-semibold text-slate-700">{money(lead.invoice_amount || lead.estimated_value)}</span> value</span>
        <span><span className="font-semibold text-slate-700">{lead.doc_count || 0}</span> docs</span>
        {lead.follow_up_date ? <span className="text-amber-700">Follow-up: {when(lead.follow_up_date, true)}</span> : null}
      </div>
    </button>
  );
}

export function WorkflowQueue({ deck, pagedLeads, selectedId, currentPage, totalPages, pageLoading, onSelectLead, onPageChange }) {
  return (
    <div className={`${T.panel} flex flex-col gap-4 px-5 py-5`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className={T.kicker}>Tracked Queue</p>
          <h2 className="mt-0.5 text-base font-bold text-slate-900">Workflow Leads</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
            {compact(deck.filteredCount)} leads
          </span>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
            Page {currentPage}/{totalPages}
          </span>
          {pageLoading ? <span className="text-xs text-slate-400 animate-pulse">Loading…</span> : null}
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {deck.filteredCount ? (
          pagedLeads.map(lead => (
            <LeadCard
              key={lead.lead_id}
              lead={lead}
              active={selectedId === lead.lead_id}
              onSelect={() => onSelectLead(lead.lead_id)}
            />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-12 text-center text-sm text-slate-400">
            No workflow leads matched the current filters.
          </div>
        )}
      </div>

      {/* Pagination */}
      {deck.filteredCount && totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 border-t border-slate-50 pt-3">
          <p className="text-xs text-slate-400">Page {currentPage} of {totalPages}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={pageLoading || currentPage <= 1}
              className={T.btn}
            >← Prev</button>
            <button
              type="button"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={pageLoading || currentPage >= totalPages}
              className={T.btn}
            >Next →</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
