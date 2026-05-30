"use client";

import DashboardIcon from "../../dashboard/icons";
import LeadRowCard from "./LeadRowCard";
import { LEAD_GHOST_BUTTON_CLASS, LEAD_KICKER_CLASS, LEAD_PRIMARY_BUTTON_CLASS, LEAD_PANEL_CLASS } from "../shared/leadPageConstants";

export default function LeadListSection({
  allPicked, canEdit, canManage, emptyLeadsMessage, enabledStatuses,
  leadMeta, page, picked, rows, rowActions, teamBadgeLabel, totalMatched, totalPages,
}) {
  const from = totalMatched ? (page - 1) * leadMeta.page_size + 1 : 0;
  const to = Math.min(page * leadMeta.page_size, totalMatched);
  const canSelectFiltered = canManage && allPicked && totalMatched > rows.length;

  return (
    <div className="space-y-3">
      {/* List header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">{totalMatched} leads</span>
          {totalMatched > leadMeta.page_size ? (
            <span className="text-xs text-slate-400">· showing {from}–{to}</span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManage && rows.length ? (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-amber-300 hover:text-amber-800">
              <input
                type="checkbox"
                checked={allPicked}
                onChange={rowActions.onToggleAllPicked}
                className="h-3.5 w-3.5 rounded border-slate-300 accent-amber-500"
              />
              Select page
            </label>
          ) : null}
          {canManage && picked.length ? (
            <span className="rounded-xl border border-amber-200 bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">
              {picked.length} selected
            </span>
          ) : null}
        </div>
      </div>
      {canSelectFiltered ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <span>
            {rowActions.allFilteredPicked
              ? `All ${totalMatched} filtered leads selected.`
              : `Only this page is selected. Select all ${totalMatched} filtered leads to bulk assign everyone.`}
          </span>
          {!rowActions.allFilteredPicked ? (
            <button
              className="rounded-xl border border-amber-300 bg-white px-3 py-1.5 font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
              type="button"
              onClick={rowActions.onSelectAllFiltered}
              disabled={rowActions.selectingAllFiltered}
            >
              {rowActions.selectingAllFiltered ? "Selecting..." : `Select all ${totalMatched}`}
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Cards */}
      {rows.length ? (
        <div className="space-y-2.5">
          {rows.map(lead => (
            <LeadRowCard
              key={lead.lead_id}
              activeLead={rowActions.activeLead}
              canTransferRow={rowActions.canTransferActiveLead && rowActions.selectedId === lead.lead_id}
              canEdit={canEdit}
              canManage={canManage}
              enabledStatuses={enabledStatuses}
              picked={picked.includes(lead.lead_id)}
              selected={rowActions.selectedId === lead.lead_id}
              teamBadgeLabel={teamBadgeLabel}
              onPickToggle={() => rowActions.onPickToggle(lead.lead_id)}
              onSelectToggle={() => rowActions.onSelectToggle(lead.lead_id)}
              {...rowActions.sharedProps}
              lead={lead}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
            <DashboardIcon name="leads" className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-slate-700">No leads matched</p>
          <p className="max-w-sm text-xs text-slate-400">{emptyLeadsMessage}</p>
        </div>
      )}

      {/* Pagination */}
      {totalMatched > leadMeta.page_size ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
          <span className="text-xs text-slate-400">Page {Math.min(page, totalPages)} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              className={LEAD_GHOST_BUTTON_CLASS}
              type="button"
              disabled={page === 1}
              onClick={() => rowActions.onPageChange(Math.max(1, page - 1))}
            >← Prev</button>
            <button
              className={LEAD_PRIMARY_BUTTON_CLASS}
              type="button"
              disabled={page === totalPages}
              onClick={() => rowActions.onPageChange(Math.min(totalPages, page + 1))}
            >Next →</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
