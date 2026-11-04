"use client";

import { T, Pill, StageDot, STAGE_PILL, STATUS_PILL } from "./workflow-tokens";
import { compact, money, titleize, when } from "./workflow-utils";

function LeadRow({ lead, active, onSelect }) {
  const owner = lead.assigned_to_name || lead.legal_owner_name || lead.finance_owner_name || "Unassigned";
  const stage = lead.workflow_stage || "sales";
  const overdue = lead.follow_up_date && new Date(lead.follow_up_date) < new Date();
  return (
    <li>
      <button type="button" onClick={onSelect} aria-current={active ? "true" : undefined}
        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${active ? "bg-brand-50/70" : "hover:bg-slate-50"}`}>
        <span className={`h-9 w-1 shrink-0 rounded-full ${active ? "bg-brand-500" : "bg-transparent"}`} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <StageDot stage={stage} />
            <b className="truncate text-[13.5px] font-semibold text-slate-900">{lead.company_name || "Untitled lead"}</b>
          </span>
          <span className="mt-0.5 block truncate text-[12px] text-slate-500">{lead.contact_person || "No contact"} · {owner}</span>
        </span>
        <span className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
          <span className="flex gap-1.5"><Pill label={titleize(stage)} map={STAGE_PILL} /><Pill label={titleize(lead.status || "new")} map={STATUS_PILL} /></span>
          <span className="text-[11.5px] text-slate-500">
            <b className="font-semibold text-slate-700">{money(lead.invoice_amount || lead.estimated_value)}</b> · {lead.doc_count || 0} docs
            {lead.follow_up_date ? <span className={overdue ? " text-rose-600" : ""}> · {when(lead.follow_up_date, true)}</span> : null}
          </span>
        </span>
      </button>
    </li>
  );
}

/** The workflow leads, one row each; picking one shows it on the right. */
export function WorkflowQueue({ deck, pagedLeads, selectedId, currentPage, totalPages, pageLoading, onSelectLead, onPageChange }) {
  return (
    <section className={`${T.panel} min-w-0 overflow-hidden`}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="text-[14px] font-bold text-slate-900">Workflow leads</h2>
          <p className="text-[12px] text-slate-500">{compact(deck.filteredCount)} leads · most recently updated first</p>
        </div>
        {pageLoading ? <span className="animate-pulse text-[12px] text-slate-400">Loading…</span> : null}
      </header>

      {deck.filteredCount ? (
        <ul className="divide-y divide-slate-100">
          {pagedLeads.map((lead) => <LeadRow key={lead.lead_id} lead={lead} active={selectedId === lead.lead_id} onSelect={() => onSelectLead(lead.lead_id)} />)}
        </ul>
      ) : (
        <p className="px-6 py-14 text-center text-[13px] text-slate-400">No workflow leads match these filters.</p>
      )}

      {deck.filteredCount && totalPages > 1 ? (
        <footer className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-2.5">
          <p className="text-[12px] text-slate-500">Page {currentPage} of {totalPages}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={pageLoading || currentPage <= 1} className={T.btn}>Previous</button>
            <button type="button" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={pageLoading || currentPage >= totalPages} className={T.btn}>Next</button>
          </div>
        </footer>
      ) : null}
    </section>
  );
}
