"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { isPlatformConsoleRole } from "../../../lib/teamScope";
import { LEAD_DATE_PRESET_OPTIONS } from "../filters/leadFilterOptions";
import { getDatePresetRange } from "../filters/leadFilterUtils";
import { MANAGER_ROLES } from "./leadPageConstants";

const LEAD_FILTER_STORAGE_KEY = "greencrm_lead_filters";

function readStoredFilters() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(LEAD_FILTER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useLeadFilterState({ role, session }) {
  const [assignedTo, setAssignedTo] = useState("all");
  const [company, setCompany] = useState("all");
  const [createdBy, setCreatedBy] = useState("all");
  const [datePreset, setDatePreset] = useState("all");
  const [dateFilterType, setDateFilterType] = useState("created_at");
  const [fromDate, setFromDate] = useState("");
  const [priority, setPriority] = useState("all");
  const [notesSearch, setNotesSearch] = useState("");
  const [debouncedNotesSearch, setDebouncedNotesSearch] = useState("");
  const notesSearchTimerRef = useRef(null);
  const [product, setProduct] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimerRef = useRef(null);
  const [source, setSource] = useState("all");
  const [status, setStatus] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [toDate, setToDate] = useState("");
  const [hasPayment, setHasPayment] = useState(false);
  const [workflowStage, setWorkflowStage] = useState("all");
  const restoredRef = useRef(false);
  const isPlatformConsole = isPlatformConsoleRole(role);
  const hasFixedAssigneeScope = ["sales", "marketing", "viewer"].includes(role);
  const canManage = MANAGER_ROLES.includes(role);
  const scopedCompanyId = isPlatformConsole && company !== "all" ? company : undefined;
  const teamCompanyId = isPlatformConsole ? scopedCompanyId : session?.user?.company_id || session?.company?.company_id || "";
  const quickFilter = useMemo(() => (["active", "working", "pending", "assigned", "unassigned", "transferred"].includes(status) ? status : undefined), [status]);

  useEffect(() => {
    if (hasFixedAssigneeScope && session?.user?.user_id) {
      setAssignedTo((current) => (current === session.user.user_id ? current : session.user.user_id));
    }
  }, [hasFixedAssigneeScope, session?.user?.user_id]);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const stored = readStoredFilters();
    if (!stored) return;
    if (stored.status) setStatus(stored.status);
    if (stored.priority) setPriority(stored.priority);
    if (stored.source) setSource(stored.source);
    if (stored.product) setProduct(stored.product);
    if (stored.workflowStage) setWorkflowStage(stored.workflowStage);
    if (stored.teamFilter) setTeamFilter(stored.teamFilter);
    if (stored.datePreset) setDatePreset(stored.datePreset);
    if (stored.dateFilterType) setDateFilterType(stored.dateFilterType);
    if (stored.fromDate) setFromDate(stored.fromDate);
    if (stored.toDate) setToDate(stored.toDate);
    if (stored.createdBy) setCreatedBy(stored.createdBy);
    if (stored.company) setCompany(stored.company);
    if (stored.assignedTo && !hasFixedAssigneeScope) setAssignedTo(stored.assignedTo);
    if (stored.hasPayment) setHasPayment(stored.hasPayment);
  }, [hasFixedAssigneeScope]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const data = { status, priority, source, product, workflowStage, teamFilter, datePreset, dateFilterType, fromDate, toDate, createdBy, company, assignedTo, hasPayment };
    try {
      sessionStorage.setItem(LEAD_FILTER_STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, [status, priority, source, product, workflowStage, teamFilter, datePreset, dateFilterType, fromDate, toDate, createdBy, company, assignedTo, hasPayment]);

  const leadQueryBase = useMemo(
    () => ({
      company_id: scopedCompanyId,
      team_ids: teamFilter !== "all" ? teamFilter : undefined,
      search: debouncedSearch.trim() || undefined,
      notes_search: debouncedNotesSearch.trim() || undefined,
      product_id: product !== "all" ? product : undefined,
      priority: priority !== "all" ? priority : undefined,
      lead_source: source !== "all" ? source : undefined,
      assigned_to: assignedTo !== "all" ? assignedTo : undefined,
      workflow_stage: workflowStage !== "all" ? workflowStage : undefined,
      created_by: createdBy !== "all" ? createdBy : undefined,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      date_filter_type: dateFilterType,
      status: quickFilter ? undefined : status,
      quick_filter: quickFilter,
      has_payment: hasPayment || undefined,
    }),
    [assignedTo, createdBy, debouncedNotesSearch, debouncedSearch, fromDate, priority, product, quickFilter, scopedCompanyId, source, status, teamFilter, toDate, workflowStage, hasPayment, dateFilterType]
  );

  const activeFilterCount = useMemo(
    () =>
      [
        Boolean(search.trim()),
        Boolean(notesSearch.trim()),
        status !== "all",
        product !== "all",
        priority !== "all",
        source !== "all",
        workflowStage !== "all",
        canManage && createdBy !== "all",
        !hasFixedAssigneeScope && assignedTo !== "all",
        Boolean(fromDate || toDate),
        teamFilter !== "all",
        isPlatformConsole && company !== "all",
      ].filter(Boolean).length,
    [assignedTo, canManage, company, createdBy, fromDate, hasFixedAssigneeScope, isPlatformConsole, notesSearch, priority, product, search, source, status, teamFilter, toDate, workflowStage]
  );

  function handleNotesSearchChange(value) {
    setNotesSearch(value);
    if (notesSearchTimerRef.current) clearTimeout(notesSearchTimerRef.current);
    notesSearchTimerRef.current = setTimeout(() => setDebouncedNotesSearch(value), 500);
  }

  function handleSearchChange(value) {
    setSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  }

  function resetLeadFilters() {
    setSearch("");
    setDebouncedSearch("");
    setNotesSearch("");
    setDebouncedNotesSearch("");
    setStatus("all");
    setProduct("all");
    setPriority("all");
    setSource("all");
    setAssignedTo(hasFixedAssigneeScope ? session?.user?.user_id || "all" : "all");
    setWorkflowStage("all");
    setCreatedBy("all");
    setDatePreset("all");
    setDateFilterType("created_at");
    setFromDate("");
    setToDate("");
    setTeamFilter("all");
    if (isPlatformConsole) {
      setCompany("all");
    }
    try { sessionStorage.removeItem(LEAD_FILTER_STORAGE_KEY); } catch {}
  }

  function handleDatePresetChange(nextPreset) {
    setDatePreset(nextPreset);
    const range = getDatePresetRange(nextPreset);
    if (range) {
      setFromDate(range.from);
      setToDate(range.to);
    }
  }

  function handleFromDateChange(value) {
    setFromDate(value);
    setDatePreset(value || toDate ? "custom" : "all");
  }

  function handleToDateChange(value) {
    setToDate(value);
    setDatePreset(fromDate || value ? "custom" : "all");
  }

  const applyQueryFilters = useCallback((query = {}) => {
    setSearch(query.search || "");
    setDebouncedSearch(query.search || "");
    setNotesSearch(query.notesSearch || "");
    setDebouncedNotesSearch(query.notesSearch || "");
    setStatus(query.status || "all");
    setProduct(query.product || "all");
    setPriority(query.priority || "all");
    setSource(query.source || "all");
    setWorkflowStage(query.workflowStage || "all");
    setCreatedBy(query.createdBy || "all");
    setFromDate(query.fromDate || "");
    setToDate(query.toDate || "");
    setDatePreset(query.fromDate || query.toDate ? "custom" : "all");
    setDateFilterType(query.dateFilterType || "created_at");
    setTeamFilter(query.teamFilter || "all");

    if (isPlatformConsole) {
      setCompany(query.company || "all");
    }

    setAssignedTo(
      hasFixedAssigneeScope
        ? session?.user?.user_id || "all"
        : query.assignedTo || "all"
    );
  }, [hasFixedAssigneeScope, isPlatformConsole, session?.user?.user_id]);

  return {
    activeFilterCount,
    applyQueryFilters,
    assignedTo,
    company,
    createdBy,
    datePreset,
    dateFilterType,
    datePresetOptions: LEAD_DATE_PRESET_OPTIONS,
    fromDate,
    handleDatePresetChange,
    handleFromDateChange,
    handleToDateChange,
    hasFixedAssigneeScope,
    isPlatformConsole,
    leadQueryBase,
    priority,
    product,
    resetLeadFilters,
    scopedCompanyId,
    notesSearch,
    search,
    setAssignedTo,
    setCompany,
    setCreatedBy,
    setPriority,
    setProduct,
    setDateFilterType,
    setNotesSearch: handleNotesSearchChange,
    setSearch: handleSearchChange,
    setSource,
    setStatus,
    setTeamFilter,
    setWorkflowStage,
    source,
    status,
    teamCompanyId,
    teamFilter,
    setToDate,
    hasPayment,
    setHasPayment,
    toDate,
    workflowStage,
  };
}
