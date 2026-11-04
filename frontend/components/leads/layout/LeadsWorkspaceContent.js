"use client";

import { useState } from "react";
import ReportDrawer from "../../reports/ReportDrawer";
import { useReportLayout } from "../../reports/useReportLayout";
import { API_BASE } from "../../../lib/api";
import LeadBulkAssignCard from "../bulk/LeadBulkAssignCard";
import LeadImportModal from "../import/LeadImportModal";
import { buildQueryPath } from "../shared/leadPageFormatters";
import LeadBulkBar from "../workspace/LeadBulkBar";
import LeadDrawer from "../workspace/LeadDrawer";
import LeadsBoard from "../workspace/LeadsBoard";
import LeadsTable from "../workspace/LeadsTable";
import { LEAD_REPORT_PRESETS } from "../workspace/leadWorkspaceConfig";
import LeadsWorkspaceHeader from "./LeadsWorkspaceHeader";
import LeadsWorkspaceShell from "./LeadsWorkspaceShell";

function LeadExportDrawer({ open, onClose, token, leadQueryBase, total, filterLabel }) {
  const report = useReportLayout({ token, catalogPath: "/leads/export/columns", storageKey: "greencrm:leads-report", presets: LEAD_REPORT_PRESETS });
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    setDownloading(true);
    setError("");
    try {
      const base = buildQueryPath("/leads/export", { ...leadQueryBase, filter_label: filterLabel || undefined });
      const response = await fetch(`${API_BASE}${base}${base.includes("?") ? "&" : "?"}${report.query}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "The report could not be created.");
      }
      const blob = await response.blob();
      const name = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") || "")?.[1] || "GreenCRM-leads.xlsx";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <ReportDrawer open={open} onClose={onClose} title="Leads Excel report" report={report} onDownload={download} downloading={downloading} error={error}
      subtitle={`${total.toLocaleString("en-IN")} leads${filterLabel ? ` · ${filterLabel}` : ""} · uses the filters on this page`} />
  );
}

export default function LeadsWorkspaceContent({
  allFilteredPicked, allPicked, bulkUsersMessage, canCreate, canImport, companies, session, canEdit, canManage, canTransferActive, activeView, columns, counts, customViews, drawerLead, drawerNav,
  emptyLeadsMessage, enabledStatuses, filterLabel, filterWorkspaceProps, filters, isPlatformConsole, onApplyView, onBulkDone, onClearPicked, onCloseDrawer, onColumns, onDeleteView, onOpenLead,
  onPageSize, onPickToggle, onRefresh, onSaveView, onSelectAllFiltered, onStatusUpdated, onToggleAllPicked, onViewMode, ownershipActions, ownershipLabel, pageSize, picked, pickedTeamIds,
  records, resources, boardSeed, cards, onCards, selectingAllFiltered, selectedId, selfId, sharedProps, title, token, viewMode, views, detailLoading,
}) {
  const [exportOpen, setExportOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  return (
    <LeadsWorkspaceShell>
      <LeadsWorkspaceHeader
        activeView={activeView} canCreate={canCreate} canManage={canManage} columns={columns} counts={counts} customViews={customViews} filtersProps={filterWorkspaceProps}
        onApplyView={onApplyView} onColumns={onColumns} onDeleteView={onDeleteView} onExport={() => setExportOpen(true)} onSaveView={onSaveView} onViewMode={onViewMode}
        ownershipLabel={ownershipLabel} canImport={canImport} onImport={() => setImportOpen(true)} title={title} viewMode={viewMode} views={views}
        cards={cards} onCards={onCards} listMeta={records.leadMeta}
      />

      {canManage && picked.length && assignOpen ? (
        <LeadBulkAssignCard
          bulkAssign={ownershipActions.bulkAssign} bulkAssigning={ownershipActions.bulkAssigning} bulkNote={ownershipActions.bulkNote} bulkOwner={ownershipActions.bulkOwner}
          bulkUsers={resources.bulkUsers} bulkUsersMessage={bulkUsersMessage}
          clearBulkSelection={() => { onClearPicked(); setAssignOpen(false); ownershipActions.setBulkOwner(""); ownershipActions.setBulkNote(""); }}
          company={filters.company} isPlatformConsole={isPlatformConsole} pickedCount={picked.length} pickedTeamIds={pickedTeamIds}
          setBulkNote={ownershipActions.setBulkNote} setBulkOwner={ownershipActions.setBulkOwner}
        />
      ) : null}

      {viewMode === "board" ? (
        <LeadsBoard token={token} queryBase={filters.leadQueryBase} enabledStatuses={enabledStatuses} canEdit={canEdit} teamUsers={resources.teamUsers}
          selectedId={selectedId} onOpen={onOpenLead} onStatusUpdated={onStatusUpdated} seed={boardSeed} />
      ) : (
        <LeadsTable
          rows={records.leads} loading={records.loading} columns={columns} sort={filters.sort} sortDir={filters.sortDir} onSort={filters.setSorting}
          canEdit={canEdit} canManage={canManage} enabledStatuses={enabledStatuses} token={token} teamUsers={resources.teamUsers}
          picked={picked} allPicked={allPicked} onPickToggle={onPickToggle} onToggleAllPicked={onToggleAllPicked}
          selectedId={selectedId} onOpen={onOpenLead} onStatusUpdated={onStatusUpdated} onNoteSaved={sharedProps.onInlineNoteSaved} onRefresh={onRefresh} emptyMessage={emptyLeadsMessage}
          page={records.page} totalPages={records.totalPages} total={records.totalMatched} pageSize={pageSize} onPage={records.setPage} onPageSize={onPageSize}
        />
      )}

      {canManage ? (
        <LeadBulkBar picked={picked} total={records.totalMatched} allFilteredPicked={allFilteredPicked} selectingAll={selectingAllFiltered} onSelectAll={onSelectAllFiltered}
          onClear={() => { onClearPicked(); setAssignOpen(false); }} onAssign={() => setAssignOpen((o) => !o)} assignOpen={assignOpen} enabledStatuses={enabledStatuses} token={token} onDone={onBulkDone} />
      ) : null}

      <LeadDrawer lead={drawerLead} loading={detailLoading} onClose={onCloseDrawer} onPrev={drawerNav.prev} onNext={drawerNav.next} canEdit={canEdit} canManage={canManage} canTransfer={canTransferActive}
        enabledStatuses={enabledStatuses} onStatusUpdated={onStatusUpdated} onRefresh={onRefresh} shared={sharedProps} selfId={selfId} />

      {canImport ? (
        <LeadImportModal open={importOpen} onClose={() => setImportOpen(false)} onImported={onRefresh} token={token} session={session} companies={companies} isPlatformConsole={isPlatformConsole} canAssign={canManage} />
      ) : null}

      <LeadExportDrawer open={exportOpen} onClose={() => setExportOpen(false)} token={token} leadQueryBase={filters.leadQueryBase} total={records.totalMatched} filterLabel={filterLabel} />
    </LeadsWorkspaceShell>
  );
}
