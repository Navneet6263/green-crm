"use client";

import { WorkflowHeader } from "./WorkflowHeader";
import { WorkflowQueue } from "./WorkflowQueue";
import { WorkflowDetail } from "./WorkflowDetail";

export function WorkflowWorkspaceView({
  deck,
  pagedLeads,
  currentPage,
  totalPages,
  pageSize,
  filters,
  selectedLead,
  selectedId,
  analysis,
  loading,
  pageLoading,
  detailLoading,
  error,
  onSelectLead,
  onPageChange,
  onRefresh,
  onFilterChange,
  onResetFilters,
}) {
  return (
    <div className="mx-auto max-w-[1320px] space-y-5 px-1">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      <WorkflowHeader
        deck={deck}
        filters={filters}
        onFilterChange={onFilterChange}
        onResetFilters={onResetFilters}
        onRefresh={onRefresh}
      />

      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-100 bg-white text-sm text-slate-400">
          Loading workflow desk…
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1fr_420px] xl:items-start">
          <WorkflowQueue
            deck={deck}
            pagedLeads={pagedLeads}
            selectedId={selectedId}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            pageLoading={pageLoading}
            onSelectLead={onSelectLead}
            onPageChange={onPageChange}
          />
          <WorkflowDetail
            selectedLead={selectedLead}
            analysis={analysis}
            detailLoading={detailLoading}
          />
        </div>
      )}
    </div>
  );
}
