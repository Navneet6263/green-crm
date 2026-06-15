"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import DashboardShell from "../../components/dashboard/DashboardShell";
import LeadsWorkspaceContent from "../../components/leads/layout/LeadsWorkspaceContent";
import { useCustomization } from "../../lib/useCustomization";
import { getEnabledStatuses } from "../../lib/leadStatusHelper";
import {
  CREATE_ROLES,
  LEAD_GHOST_BUTTON_CLASS,
  LEAD_INPUT_CLASS,
  LEAD_KICKER_CLASS,
  LEGAL_TRANSFER_ROLES,
  MANAGER_ROLES,
} from "../../components/leads/shared/leadPageConstants";
import {
  formatLeadMoney,
  titleizeLeadValue,
} from "../../components/leads/shared/leadPageFormatters";
import { useLeadBulkUpload } from "../../components/leads/shared/useLeadBulkUpload";
import { useLeadCollaboratorActions } from "../../components/leads/shared/useLeadCollaboratorActions";
import { useLeadExport } from "../../components/leads/shared/useLeadExport";
import { fetchLeadExportRows } from "../../components/leads/shared/leadExportUtils";
import { useLeadFilterFields } from "../../components/leads/shared/useLeadFilterFields";
import { useLeadFilterState } from "../../components/leads/shared/useLeadFilterState";
import { useLeadListData } from "../../components/leads/shared/useLeadListData";
import { useLeadOwnershipActions } from "../../components/leads/shared/useLeadOwnershipActions";
import { useLeadSelection } from "../../components/leads/shared/useLeadSelection";
import { useLeadScopeResources } from "../../components/leads/shared/useLeadScopeResources";
import { useLeadSessionAccess } from "../../components/leads/shared/useLeadSessionAccess";
import { AlertError, AlertSuccess } from "../../components/ui/Alert";
import { parseLeadFilterSearchParams } from "../../components/leads/shared/leadFilterQuery";
import {
  isPlatformConsoleRole,
  scopedUsersEmptyMessage,
  teamBadgeLabel,
  teamSelectLabel,
} from "../../lib/teamScope";
import {
  withAssignedWorkflowUser,
  workflowUsersEmptyMessage,
} from "../../lib/workflowOwners";

function LeadsPageContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [picked, setPicked] = useState([]);
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [selectedLeadPool, setSelectedLeadPool] = useState([]);
  const [selectingAllFiltered, setSelectingAllFiltered] = useState(false);
  const { accessError, booting, companies, session } = useLeadSessionAccess();
  
  // Load customization settings
  const { customization } = useCustomization(session?.token);
  const enabledStatuses = customization ? getEnabledStatuses(customization) : [];
  
  const role = session?.user?.role || "";
  const isPlatformConsole = isPlatformConsoleRole(role);
  const isSuper = role === "super-admin";
  const canManage = MANAGER_ROLES.includes(role);
  const canCreate = CREATE_ROLES.includes(role);
  const canEdit = role !== "viewer";
  const filters = useLeadFilterState({ role, session });
  const { applyQueryFilters } = filters;
  const searchParamsKey = searchParams?.toString?.() || "";
  const parsedQueryFilters = useMemo(
    () => parseLeadFilterSearchParams(searchParams),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParamsKey]
  );
  const records = useLeadListData({ leadQueryBase: filters.leadQueryBase, refreshSeed, session });
  const selection = useLeadSelection({
    leads: records.leads,
    resetKey: `${records.leadCacheKey}:${refreshSeed}`,
    session,
  });
  const canLoadScopedUsers = canManage || LEGAL_TRANSFER_ROLES.includes(role);
  const scopedTeamId =
    filters.teamFilter !== "all" ? filters.teamFilter : selection.activeLead?.team_id || "";
  const teamCompanyId = filters.teamCompanyId || selection.activeLead?.company_id || "";
  const leadOptionPool = records.allMatchedLeads.length ? records.allMatchedLeads : records.leads;
  const selectedScopeLeads = selectedLeadPool.length ? selectedLeadPool : leadOptionPool;
  const pickedTeamIds = useMemo(() => [...new Set(selectedScopeLeads.filter((lead) => picked.includes(lead.lead_id)).map((lead) => lead.team_id).filter(Boolean))], [picked, selectedScopeLeads]);
  const handleInvalidTeamFilter = useCallback(() => {
    filters.setTeamFilter("all");
  }, [filters.setTeamFilter]);
  const resources = useLeadScopeResources({ canLoadScopedUsers, canManage, isPlatformConsole, onInvalidTeamFilter: handleInvalidTeamFilter, pickedTeamIds, refreshSeed, scopedCompanyId: filters.scopedCompanyId, scopedTeamId, session, teamCompanyId, teamFilter: filters.teamFilter });
  const leadFilterFields = useLeadFilterFields({ companies, filterUsers: resources.filterUsers, filters, leadOptionPool, productOptions: resources.productOptions, role, session, teams: resources.teams });
  const bulkUpload = useLeadBulkUpload({ onImported: () => setRefreshSeed((current) => current + 1), setError, setNotice, token: session?.token });
  const leadExport = useLeadExport({ allMatchedLeads: records.allMatchedLeads, leadQueryBase: filters.leadQueryBase, setError, setNotice, token: session?.token, totalMatched: records.totalMatched });

  useEffect(() => { if (accessError) setError(accessError); }, [accessError]);
  useEffect(() => { if (records.listError) setError(records.listError); }, [records.listError]);
  useEffect(() => { if (selection.detailError) setError(selection.detailError); }, [selection.detailError]);
  const appliedSyncKeyRef = useRef("");
  useEffect(() => {
    if (!session?.user?.user_id) return;
    const incomingKey = parsedQueryFilters.syncKey || "";
    if (appliedSyncKeyRef.current === incomingKey && incomingKey === "") return;
    if (appliedSyncKeyRef.current === incomingKey) return;
    appliedSyncKeyRef.current = incomingKey;
    applyQueryFilters(parsedQueryFilters);
  }, [applyQueryFilters, parsedQueryFilters, session?.user?.user_id]);
  useEffect(() => { records.setPage(1); setSelectedLeadPool([]); setPicked([]); }, [filters.leadQueryBase]);
  useEffect(() => {
    setPicked((current) => current.filter((id) => selectedScopeLeads.some((lead) => lead.lead_id === id)));
  }, [selectedScopeLeads]);

  function mergeLeadState(updatedLead) {
    records.mergeUpdatedLead(updatedLead);
    selection.mergeSelectedLead(updatedLead);
  }

  const collaboratorActions = useLeadCollaboratorActions({
    activeLead: selection.activeLead,
    mergeLead: mergeLeadState,
    session,
    setError,
    setNotice,
    teamUsers: resources.teamUsers,
  });
  const ownershipActions = useLeadOwnershipActions({
    activeLead: selection.activeLead,
    applyOwner: records.applyOwnerChanges,
    bulkUsers: resources.bulkUsers,
    clearSelection: selection.clearSelection,
    leads: selectedScopeLeads,
    mergeLead: mergeLeadState,
    onArchived: () => setRefreshSeed((current) => current + 1),
    picked,
    setPicked,
    setSelectedLead: selection.setSelected,
    setError,
    setNotice,
    session,
    teamUsers: resources.teamUsers,
  });
  const selectedScopeTeam =
    resources.teams.find((entry) => entry.team_id === scopedTeamId)
    || (selection.activeLead?.team_name ? { name: selection.activeLead.team_name } : null);
  const bulkScopeTeam = resources.teams.find((entry) => entry.team_id === pickedTeamIds[0]) || null;
  const legalUsers = useMemo(
    () =>
      withAssignedWorkflowUser(
        resources.teamUsers.filter((user) => user.role === "legal-team"),
        selection.activeLead?.assigned_to_legal,
        selection.activeLead?.legal_owner_name,
        "legal-team"
      ),
    [
      resources.teamUsers,
      selection.activeLead?.assigned_to_legal,
      selection.activeLead?.legal_owner_name,
    ]
  );
  const canTransferActiveLead =
    Boolean(selection.activeLead?.can_transfer_to_legal) &&
    LEGAL_TRANSFER_ROLES.includes(role);
  const collaboratorUsersMessage = scopedUsersEmptyMessage(selectedScopeTeam);
  const legalUsersMessage = workflowUsersEmptyMessage(selection.activeLead?.team_name, "legal");
  const ownershipLabel = ["sales", "marketing"].includes(role) ? "Assigned to you" : isPlatformConsole ? filters.company === "all" ? isSuper ? "Cross-tenant" : "Assigned companies" : "Single tenant" : "Tenant-wide";
  const closedWonCount = filters.status === "closed-won" ? records.totalMatched : records.leads.filter((lead) => lead.status === "closed-won").length;
  const transferredCount = filters.status === "transferred" ? records.totalMatched : records.leads.filter((lead) => ["legal", "finance", "completed"].includes(lead.workflow_stage || "sales")).length;
  const heroStats = useMemo(() => {
    const totalVal = records.leadMeta?.total_value || records.leads.reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0);
    const closedWon = records.leadMeta?.total_closed_won ?? closedWonCount;
    const advanceReceived = records.leadMeta?.total_advance_received || 0;

    const stats = [
      { label: "Total Team Leads", value: records.totalMatched },
      { label: filters.hasPayment ? "Total Value (Filtered)" : "Total Value", value: formatLeadMoney(totalVal), color: "#0f8c53", onClick: () => filters.setHasPayment(!filters.hasPayment) },
      { label: filters.hasPayment ? "Advance Received (Filtered)" : "Advance Received", value: formatLeadMoney(advanceReceived), color: "#2f6fdd", onClick: () => filters.setHasPayment(!filters.hasPayment) },
      { label: "Closed Won", value: closedWon, color: "#0f8c53" }
    ];

    const wf = records.leadMeta?.workflow_summary;
    if (wf && wf.total_workflow_leads > 0) {
      stats.unshift(
        { label: "Total Received", value: formatLeadMoney(wf.total_advance_received), color: "#0f8c53" },
        { label: "Total Pending", value: formatLeadMoney(wf.total_remaining_payment), color: "#ea580c" },
        { label: "Active Workflows", value: wf.active_workflow_leads, color: "#2f6fdd" },
        { label: "Completed Workflows", value: wf.completed_workflow_leads, color: "#0f8c53" }
      );
    }
    return stats;
  }, [closedWonCount, records.leads, records.totalMatched, records.leadMeta?.workflow_summary, filters.hasPayment, filters.setHasPayment]);
  const emptyLeadsMessage = filters.teamFilter !== "all" && selectedScopeTeam ? `No leads matched ${teamSelectLabel(selectedScopeTeam)}.` : "Adjust the search or filters to widen the result set.";
  const bulkUsersMessage = pickedTeamIds.length > 1 ? "Select leads from one team at a time before bulk assignment." : scopedUsersEmptyMessage(bulkScopeTeam);
  const allPicked = !!records.leads.length && records.leads.every((lead) => picked.includes(lead.lead_id));
  const allFilteredPicked = !!records.totalMatched && picked.length === records.totalMatched;
  const showBlockingLoader = booting;
  const handleSelectAllFiltered = async () => {
    if (!session?.token || !records.totalMatched) return;
    setSelectingAllFiltered(true);
    setError("");
    setNotice("");

    try {
      const leads =
        records.allMatchedLeads.length === records.totalMatched
          ? records.allMatchedLeads
          : await fetchLeadExportRows({
            token: session.token,
            leadQueryBase: filters.leadQueryBase,
            totalMatched: records.totalMatched,
          });

      setSelectedLeadPool(leads);
      setPicked(leads.map((lead) => lead.lead_id));
      setNotice(`${leads.length} filtered leads selected.`);
    } catch (requestError) {
      setError(requestError.message || "Could not select all filtered leads.");
    } finally {
      setSelectingAllFiltered(false);
    }
  };
  const handleInlineStatusUpdate = (updatedLead) => {
    mergeLeadState(updatedLead);
    setNotice(`Lead status moved to ${titleizeLeadValue(updatedLead.status || "new")}.`);
  };
  const handleInlineNoteSaved = useCallback((leadId, content) => {
    const existingLead =
      (selection.activeLead?.lead_id === leadId ? selection.activeLead : null)
      || records.leads.find((item) => item.lead_id === leadId)
      || null;
    mergeLeadState({
      lead_id: leadId,
      latest_note: content,
      note_count: Number(existingLead?.note_count || 0) + 1,
    });
    setNotice("Follow-up note saved.");
  }, [mergeLeadState, records.leads, selection.activeLead]);
  const rowSharedProps = {
    activeLead: selection.activeLead,
    archiveLead: ownershipActions.archiveLead,
    assigning: ownershipActions.assigning,
    collaboratorUsersMessage,
    company: filters.company,
    deleting: ownershipActions.deleting,
    detailLoading: selection.detailLoading,
    handleInlineStatusUpdate,
    isPlatformConsole,
    legalTeam: legalUsers,
    legalTransferNote: ownershipActions.legalTransferNote,
    legalTransferOwner: ownershipActions.legalTransferOwner,
    legalUsersMessage,
    onOwnerChange: ownershipActions.setOwner,
    onInlineNoteSaved: handleInlineNoteSaved,
    onOwnerNoteChange: ownershipActions.setOwnerNote,
    owner: ownershipActions.owner,
    ownerNote: ownershipActions.ownerNote,
    ownerUsersMessage: collaboratorUsersMessage,
    pendingCollaborator: collaboratorActions.pendingCollaborator,
    removeCollaborator: collaboratorActions.removeCollaborator,
    removingCollaboratorId: collaboratorActions.removingCollaboratorId,
    saveCollaborator: collaboratorActions.addCollaborator,
    saveOwner: ownershipActions.saveOwner,
    savingCollaborators: collaboratorActions.savingCollaborators,
    scopedLegalUsers: resources.teamUsers.filter((user) => user.role === "legal-team"),
    sessionToken: session?.token,
    setPendingCollaborator: collaboratorActions.setPendingCollaborator,
    setLegalTransferNote: ownershipActions.setLegalTransferNote,
    setLegalTransferOwner: ownershipActions.setLegalTransferOwner,
    teamUsers: resources.teamUsers,
    transferLeadToLegal: ownershipActions.transferLeadToLegal,
    transferring: ownershipActions.transferring,
  };
  const listRowActions = {
    activeLead: selection.activeLead,
    canTransferActiveLead,
    closedWonCount,
    allFilteredPicked,
    onPageChange: records.setPage,
    onPickToggle: (leadId) => setPicked((current) => current.includes(leadId) ? current.filter((id) => id !== leadId) : [...current, leadId]),
    onSelectToggle: selection.toggleLeadSelection,
    onSelectAllFiltered: handleSelectAllFiltered,
    onToggleAllPicked: () => {
      setSelectedLeadPool([]);
      setPicked(allPicked ? [] : records.leads.map((lead) => lead.lead_id));
    },
    selectedId: selection.selectedId,
    selectingAllFiltered,
    sharedProps: rowSharedProps,
    transferredCount,
  };
  const filterWorkspaceProps = {
    search: filters.search,
    onSearchChange: filters.setSearch,
    searchPlaceholder: "Search company, contact, email, phone",
    filters: leadFilterFields,
    dateFilters: {
      preset: filters.datePreset,
      onPresetChange: filters.handleDatePresetChange,
      presetOptions: filters.datePresetOptions,
      fromDate: filters.fromDate,
      onFromDateChange: filters.handleFromDateChange,
      toDate: filters.toDate,
      onToDateChange: filters.handleToDateChange,
    },
    activeCount: filters.activeFilterCount,
    onReset: filters.resetLeadFilters,
    resetDisabled: !filters.activeFilterCount,
    onExportCsv: leadExport.exportCsv,
    onExportExcel: leadExport.exportExcel,
    onExportHtml: leadExport.exportHtml,
    exportDisabled: !records.totalMatched,
    exportingCsv: leadExport.exportingCsv,
    exportingExcel: leadExport.exportingExcel,
    exportingHtml: leadExport.exportingHtml,
    kickerClassName: LEAD_KICKER_CLASS,
    inputClassName: LEAD_INPUT_CLASS,
    buttonClassName: LEAD_GHOST_BUTTON_CLASS,
  };

  return (
    <DashboardShell session={session} title={["sales", "marketing"].includes(role) ? "My Leads" : "Lead Pipeline"} hideTitle>
      <AlertError message={error} onDismiss={() => setError("")} />
      {!error ? <AlertSuccess message={notice} onDismiss={() => setNotice("")} /> : null}
      {showBlockingLoader ? <div className="alert">Loading leads workspace...</div> : null}
      {!booting ? (
        <LeadsWorkspaceContent
          allPicked={allPicked}
          bulkUpload={bulkUpload}
          bulkUsersMessage={bulkUsersMessage}
          canCreate={canCreate}
          canEdit={canEdit}
          canManage={canManage}
          emptyLeadsMessage={emptyLeadsMessage}
          enabledStatuses={enabledStatuses}
          filterWorkspaceProps={filterWorkspaceProps}
          filters={filters}
          heroStats={heroStats}
          isPlatformConsole={isPlatformConsole}
          isSuper={isSuper}
          listRowActions={listRowActions}
          ownershipActions={ownershipActions}
          ownershipLabel={ownershipLabel}
          picked={picked}
          pickedTeamIds={pickedTeamIds}
          records={records}
          resources={resources}
          setPicked={setPicked}
          setSelectedLeadPool={setSelectedLeadPool}
          setShowBulkUpload={bulkUpload.setShowBulkUpload}
          showBulkUpload={bulkUpload.showBulkUpload}
          teamBadgeLabel={teamBadgeLabel}
        />
      ) : null}
    </DashboardShell>
  );
}

export default function LeadsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white px-5 py-8 text-sm font-medium text-slate-400">
          Loading leads workspace…
        </div>
      }
    >
      <LeadsPageContent />
    </Suspense>
  );
}
