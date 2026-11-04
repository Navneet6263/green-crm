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
  LEADS_PAGE_SIZE,
  LEGAL_TRANSFER_ROLES,
  MANAGER_ROLES,
} from "../../components/leads/shared/leadPageConstants";
import {
  buildQueryPath,
  titleizeLeadValue,
} from "../../components/leads/shared/leadPageFormatters";
import { apiRequest } from "../../lib/api";
import { DEFAULT_CARDS, DEFAULT_COLUMNS, LEAD_COLUMNS, builtInViews } from "../../components/leads/workspace/leadWorkspaceConfig";
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

const IMPORT_ROLES = ["super-admin", "platform-admin", "platform-manager", "admin", "manager", "marketing"];
const prefsKey = (userId) => `greencrm:leads-page:${userId || "me"}`;
function readPrefs(userId) {
  try { return JSON.parse(window.localStorage.getItem(prefsKey(userId)) || "{}") || {}; } catch (_error) { return {}; }
}

function LeadsPageContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [picked, setPicked] = useState([]);
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [selectedLeadPool, setSelectedLeadPool] = useState([]);
  const [selectingAllFiltered, setSelectingAllFiltered] = useState(false);
  const [pageSize, setPageSize] = useState(LEADS_PAGE_SIZE);
  const [viewMode, setViewMode] = useState("table");
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [cards, setCards] = useState(DEFAULT_CARDS);
  const [customViews, setCustomViews] = useState([]);
  const [counts, setCounts] = useState(null);
  const [dataSeed, setDataSeed] = useState(0);
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
  const records = useLeadListData({ leadQueryBase: filters.leadQueryBase, pageSize, refreshSeed, session });
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
  const leadFilterFields = useLeadFilterFields({ companies, enabledStatuses, filterUsers: resources.filterUsers, filters, leadOptionPool, productOptions: resources.productOptions, role, session, teams: resources.teams });
  const leadExport = useLeadExport({ allMatchedLeads: records.allMatchedLeads, leadQueryBase: filters.leadQueryBase, setError, setNotice, token: session?.token, totalMatched: records.totalMatched });

  // Each person's layout choices are kept on this device.
  const prefsUser = session?.user?.user_id;
  useEffect(() => {
    if (!prefsUser) return;
    const saved = readPrefs(prefsUser);
    // The Deleted leads card is new: add it once for people who already picked their cards.
    if (Array.isArray(saved.cards)) setCards(saved.cards.includes("deleted") || saved.deletedCardOffered ? saved.cards : [...saved.cards, "deleted"]);
    if ([25, 50, 100].includes(saved.pageSize)) setPageSize(saved.pageSize);
    if (saved.viewMode === "board") setViewMode("board");
    if (Array.isArray(saved.columns) && saved.columns.includes("lead")) setColumns(saved.columns.filter((key) => LEAD_COLUMNS.some((c) => c.key === key)));
    if (Array.isArray(saved.customViews)) setCustomViews(saved.customViews);
  }, [prefsUser]);
  const savePrefs = (change) => {
    try { window.localStorage.setItem(prefsKey(prefsUser), JSON.stringify({ ...readPrefs(prefsUser), ...change })); } catch (_error) { /* storage unavailable */ }
  };
  const changeCards = (next) => { setCards(next); savePrefs({ cards: next, deletedCardOffered: true }); };
  const changeColumns = (next) => { setColumns(next); savePrefs({ columns: next }); };
  const changeViewMode = (next) => { setViewMode(next); savePrefs({ viewMode: next }); };
  const changePageSize = (next) => { setPageSize(next); records.setPage(1); savePrefs({ pageSize: next }); };

  // Card and view counts follow who/what is in scope, not the status or follow-up view chosen.
  const { company_id: countCompany, team_ids: countTeam, assigned_to: countOwner, product_id: countProduct, lead_source: countSource } = filters.leadQueryBase;
  useEffect(() => {
    if (!session?.token) return undefined;
    let cancelled = false;
    apiRequest(buildQueryPath("/leads/counts", { company_id: countCompany, team_ids: countTeam, assigned_to: countOwner, product_id: countProduct, lead_source: countSource }), { token: session.token, fresh: true })
      .then((data) => { if (!cancelled) setCounts(data); })
      .catch(() => { if (!cancelled) setCounts(null); });
    return () => { cancelled = true; };
  }, [session?.token, countCompany, countTeam, countOwner, countProduct, countSource, refreshSeed, dataSeed]);

  const views = useMemo(() => builtInViews({ canManage, userId: session?.user?.user_id }), [canManage, session?.user?.user_id]);
  const activeView = useMemo(() => {
    const defaults = { status: "all", priority: "all", source: "all", product: "all", workflowStage: "all", createdBy: "all", teamFilter: "all", followUp: "", stale: false, hasPayment: false, fromDate: "", toDate: "", dateFilterType: "created_at", assignedTo: filters.hasFixedAssigneeScope ? session?.user?.user_id || "all" : "all", search: "", notesSearch: "" };
    const same = (view) => Object.keys(defaults).every((key) => (key in view.filters ? view.filters[key] : defaults[key]) === filters.snapshot[key]);
    return [...views, ...customViews].find(same)?.key || "";
  }, [views, customViews, filters.snapshot, filters.hasFixedAssigneeScope, session?.user?.user_id]);
  const applyView = (view) => filters.applyQueryFilters(view.filters);
  const saveView = (name) => {
    const next = [...customViews.filter((v) => v.label !== name), { key: `custom-${Date.now()}`, label: name, filters: filters.snapshot }];
    setCustomViews(next);
    savePrefs({ customViews: next });
    setNotice(`View "${name}" saved.`);
  };
  const deleteView = (key) => {
    const next = customViews.filter((v) => v.key !== key);
    setCustomViews(next);
    savePrefs({ customViews: next });
  };
  const filterLabel = [...views, ...customViews].find((v) => v.key === activeView && v.key !== "all")?.label || (filters.activeFilterCount ? `${filters.activeFilterCount} filter${filters.activeFilterCount === 1 ? "" : "s"} on` : "");

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
    setDataSeed((current) => current + 1);
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
  const ownershipLabel = ["sales", "marketing"].includes(role) ? "Leads assigned to you and shared with you" : isPlatformConsole ? filters.company === "all" ? isSuper ? "All companies" : "Your assigned companies" : "This company" : role === "manager" ? "Leads in the teams you manage" : "Every lead in your company";
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
  const handleInlineNoteSaved = useCallback((leadId, content, updatedLead) => {
    const existingLead =
      (selection.activeLead?.lead_id === leadId ? selection.activeLead : null)
      || records.leads.find((item) => item.lead_id === leadId)
      || null;
    mergeLeadState({
      ...(updatedLead || {}),
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
  const toggleAllPicked = () => {
    setSelectedLeadPool([]);
    setPicked(allPicked ? [] : records.leads.map((lead) => lead.lead_id));
  };
  const clearPicked = () => {
    setSelectedLeadPool([]);
    setPicked([]);
  };
  const onBulkDone = (result, action) => {
    const verb = action === "delete" ? "deleted" : "updated";
    setNotice(`${result.done} lead${result.done === 1 ? "" : "s"} ${verb}${result.failed?.length ? `, ${result.failed.length} could not be changed` : ""}.`);
    if (!result.failed?.length) clearPicked();
    setRefreshSeed((current) => current + 1);
    setDataSeed((current) => current + 1);
  };
  const orderedIds = records.leads.map((lead) => lead.lead_id);
  const drawerIndex = orderedIds.indexOf(selection.selectedId);
  const drawerNav = {
    prev: drawerIndex > 0 ? () => selection.toggleLeadSelection(orderedIds[drawerIndex - 1]) : undefined,
    next: drawerIndex >= 0 && drawerIndex < orderedIds.length - 1 ? () => selection.toggleLeadSelection(orderedIds[drawerIndex + 1]) : undefined,
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
      dateFilterType: filters.dateFilterType,
      onDateFilterTypeChange: filters.setDateFilterType,
    },
    activeCount: filters.activeFilterCount,
    onReset: filters.resetLeadFilters,
    resetDisabled: !filters.activeFilterCount,
    onExportCsv: leadExport.exportCsv,
    exportDisabled: !records.totalMatched,
    exportingCsv: leadExport.exportingCsv,
    kickerClassName: LEAD_KICKER_CLASS,
    inputClassName: LEAD_INPUT_CLASS,
    buttonClassName: LEAD_GHOST_BUTTON_CLASS,
  };

  return (
    <DashboardShell session={session} title={["sales", "marketing"].includes(role) ? "My Leads" : "Leads"} hideTitle>
      <AlertError message={error} onDismiss={() => setError("")} />
      {!error ? <AlertSuccess message={notice} onDismiss={() => setNotice("")} /> : null}
      {showBlockingLoader ? <div className="alert">Loading leads workspace...</div> : null}
      {!booting ? (
        <LeadsWorkspaceContent
          activeView={activeView}
          allFilteredPicked={allFilteredPicked}
          allPicked={allPicked}
          boardSeed={`${refreshSeed}:${dataSeed}`}
          bulkUsersMessage={bulkUsersMessage}
          canCreate={canCreate}
          canImport={IMPORT_ROLES.includes(role)}
          companies={companies}
          session={session}
          cards={cards}
          onCards={changeCards}
          selfId={prefsUser}
          canEdit={canEdit}
          canManage={canManage}
          canTransferActive={canTransferActiveLead}
          columns={columns}
          counts={counts}
          customViews={customViews}
          detailLoading={selection.detailLoading}
          drawerLead={selection.selectedId ? selection.activeLead : null}
          drawerNav={drawerNav}
          emptyLeadsMessage={emptyLeadsMessage}
          enabledStatuses={enabledStatuses}
          filterLabel={filterLabel}
          filterWorkspaceProps={filterWorkspaceProps}
          filters={filters}
          isPlatformConsole={isPlatformConsole}
          onApplyView={applyView}
          onBulkDone={onBulkDone}
          onClearPicked={clearPicked}
          onCloseDrawer={selection.clearSelection}
          onColumns={changeColumns}
          onDeleteView={deleteView}
          onOpenLead={selection.toggleLeadSelection}
          onPageSize={changePageSize}
          onPickToggle={(leadId) => setPicked((current) => (current.includes(leadId) ? current.filter((id) => id !== leadId) : [...current, leadId]))}
          onRefresh={() => setRefreshSeed((current) => current + 1)}
          onSaveView={saveView}
          onSelectAllFiltered={handleSelectAllFiltered}
          onStatusUpdated={handleInlineStatusUpdate}
          onToggleAllPicked={toggleAllPicked}
          onViewMode={changeViewMode}
          ownershipActions={ownershipActions}
          ownershipLabel={ownershipLabel}
          pageSize={pageSize}
          picked={picked}
          pickedTeamIds={pickedTeamIds}
          records={records}
          resources={resources}
          selectedId={selection.selectedId}
          selectingAllFiltered={selectingAllFiltered}
          sharedProps={rowSharedProps}
          title={["sales", "marketing"].includes(role) ? "My leads" : "Leads"}
          token={session?.token}
          viewMode={viewMode}
          views={views}
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
