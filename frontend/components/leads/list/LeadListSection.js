"use client";

import DashboardIcon from "../../dashboard/icons";
import LeadRowCard from "./LeadRowCard";
import {
  LEAD_GHOST_BUTTON_CLASS,
  LEAD_KICKER_CLASS,
  LEAD_PANEL_CLASS,
  LEAD_PRIMARY_BUTTON_CLASS,
} from "../shared/leadPageConstants";

export default function LeadListSection({
  allPicked,
  canEdit,
  canManage,
  emptyLeadsMessage,
  leadMeta,
  page,
  picked,
  rows,
  rowActions,
  teamBadgeLabel,
  totalMatched,
  totalPages,
}) {
  return (
    <article className={`${LEAD_PANEL_CLASS} overflow-hidden p-5 md:p-6`}>
      <div className="flex flex-col gap-3 border-b border-[#efe6d8] pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className={LEAD_KICKER_CLASS}>Roster</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Lead list</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
            Page {Math.min(page, totalPages)} of {totalPages}
          </span>
          {canManage && rows.length ? (
            <label className="inline-flex items-center gap-2 rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
              <input type="checkbox" checked={allPicked} onChange={rowActions.onToggleAllPicked} className="h-4 w-4 rounded border-[#d9ccb8] text-[#cba952] focus:ring-[#f3dfab]" />
              <span>Select page</span>
            </label>
          ) : null}
          {canManage && picked.length ? <span className="inline-flex rounded-full border border-[#ddd3c2] bg-[#fff6e4] px-3 py-1 text-[11px] font-bold text-[#7a6230]">{picked.length} selected</span> : null}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {rows.length ? (
          rows.map((lead) => (
            <LeadRowCard
              key={lead.lead_id}
              activeLead={rowActions.activeLead}
              canTransferRow={rowActions.canTransferActiveLead && rowActions.selectedId === lead.lead_id}
              canEdit={canEdit}
              canManage={canManage}
              picked={picked.includes(lead.lead_id)}
              selected={rowActions.selectedId === lead.lead_id}
              teamBadgeLabel={teamBadgeLabel}
              onPickToggle={() => rowActions.onPickToggle(lead.lead_id)}
              onSelectToggle={() => rowActions.onSelectToggle(lead.lead_id)}
              {...rowActions.sharedProps}
              lead={lead}
            />
          ))
        ) : (
          <div className="rounded-[28px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-14 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-[20px] bg-white text-[#8d6e27] shadow-[0_12px_24px_rgba(79,58,22,0.08)]">
              <DashboardIcon name="leads" className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-xl font-semibold text-[#060710]">No leads matched</h3>
            <p className="mt-2 text-sm text-[#7a6b57]">{emptyLeadsMessage}</p>
          </div>
        )}
      </div>

      {totalMatched > leadMeta.page_size ? (
        <div className="mt-5 flex flex-col gap-3 border-t border-[#efe6d8] pt-5 md:flex-row md:items-center md:justify-between">
          <span className="text-sm text-[#7a6b57]">
            {totalMatched ? (page - 1) * leadMeta.page_size + 1 : 0}-{Math.min(page * leadMeta.page_size, totalMatched)} of {totalMatched}
          </span>
          <div className="flex flex-wrap gap-3">
            <button className={LEAD_GHOST_BUTTON_CLASS} type="button" disabled={page === 1} onClick={() => rowActions.onPageChange(Math.max(1, page - 1))}>
              Previous
            </button>
            <button className={LEAD_PRIMARY_BUTTON_CLASS} type="button" disabled={page === totalPages} onClick={() => rowActions.onPageChange(Math.min(totalPages, page + 1))}>
              Next
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
