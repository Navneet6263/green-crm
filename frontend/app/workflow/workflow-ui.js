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
    <div className="min-w-0 space-y-4">
      {error ? (
        <div role="alert" className="rounded-[12px] bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-700 ring-1 ring-rose-200">
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
        <div className="grid gap-4 xl:grid-cols-[1fr_420px]"><div className="h-96 animate-pulse rounded-[14px] bg-white ring-1 ring-slate-200" /><div className="h-96 animate-pulse rounded-[14px] bg-white ring-1 ring-slate-200" /></div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start">
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
