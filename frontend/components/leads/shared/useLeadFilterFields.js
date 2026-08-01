"use client";

import { useEffect, useMemo } from "react";

import { MANAGER_ROLES } from "./leadPageConstants";
import { buildLeadProductPool } from "./leadPageHelpers";
import { teamSelectLabel } from "../../../lib/teamScope";
import {
  LEAD_PRIORITY_OPTIONS,
  LEAD_STATUS_OPTIONS,
  LEAD_WORKFLOW_STAGE_OPTIONS,
  getLeadStatusOptions,
} from "../filters/leadFilterOptions";
import {
  buildLeadSourceOptions,
  ensureCurrentOption,
  titleize,
} from "../filters/leadFilterUtils";

export function useLeadFilterFields({ companies, enabledStatuses, filterUsers, filters, leadOptionPool, productOptions, role, session, teams }) {
  const canManage = MANAGER_ROLES.includes(role);
  const products = useMemo(() => buildLeadProductPool(leadOptionPool, productOptions), [leadOptionPool, productOptions]);
  const sourceOptions = useMemo(() => [{ value: "all", label: "All sources" }, ...buildLeadSourceOptions(leadOptionPool, filters.source)], [filters.source, leadOptionPool]);
  const statusOptions = useMemo(() => enabledStatuses ? getLeadStatusOptions(enabledStatuses) : LEAD_STATUS_OPTIONS, [enabledStatuses]);

  const resolveScopedUserLabel = (userId, field = "assigned", fallback = "Selected user") => {
    if (!userId) {
      return fallback;
    }

    const scopedUser = filterUsers.find((user) => user.user_id === userId);
    if (scopedUser) {
      return `${scopedUser.name} | ${titleize(scopedUser.role || "user")}`;
    }

    const visibleLead = field === "created" ? leadOptionPool.find((lead) => lead.created_by === userId) : leadOptionPool.find((lead) => lead.assigned_to === userId);
    return field === "created" ? visibleLead?.created_by_name || fallback : visibleLead?.assigned_to_name || fallback;
  };

  const assigneeOptions = useMemo(() => {
    const selfOption = session?.user?.user_id ? [{ value: session.user.user_id, label: `${session.user.name || "Assigned to you"} (You)` }] : [];
    const ownerOptions = filters.hasFixedAssigneeScope ? selfOption : filterUsers.map((user) => ({ value: user.user_id, label: `${user.name} | ${titleize(user.role || "user")}` }));
    return ensureCurrentOption([{ value: "all", label: filters.hasFixedAssigneeScope ? "Assigned to you" : "All owners" }, ...ownerOptions], filters.assignedTo, resolveScopedUserLabel(filters.assignedTo, "assigned"));
  }, [filterUsers, filters.assignedTo, filters.hasFixedAssigneeScope, leadOptionPool, session?.user?.name, session?.user?.user_id]);

  const createdByOptions = useMemo(() => ensureCurrentOption([{ value: "all", label: "All creators" }, ...filterUsers.map((user) => ({ value: user.user_id, label: `${user.name} | ${titleize(user.role || "user")}` }))], filters.createdBy, resolveScopedUserLabel(filters.createdBy, "created")), [filterUsers, filters.createdBy, leadOptionPool]);

  useEffect(() => {
    if (filters.product !== "all" && !products.some((item) => item.value === filters.product)) {
      filters.setProduct("all");
    }
  }, [filters.product, filters.setProduct, products]);

  return useMemo(
    () =>
      [
        filters.isPlatformConsole ? { key: "company", label: "Tenant", value: filters.company, onChange: filters.setCompany, options: [{ value: "all", label: "All companies" }, ...companies.map((item) => ({ value: item.company_id, label: item.name }))] } : null,
        teams.length > 1 ? { key: "team", label: "Team", value: filters.teamFilter, onChange: filters.setTeamFilter, options: [{ value: "all", label: "All teams" }, ...teams.map((item) => ({ value: item.team_id, label: teamSelectLabel(item) }))] } : null,
        { key: "status", label: "Status", value: filters.status, onChange: filters.setStatus, options: statusOptions },
        { key: "notes-search", label: "Search Notes", value: filters.notesSearch, onChange: filters.setNotesSearch, options: null, isTextInput: true, placeholder: "Search notes text..." },
        { key: "product", label: "Product", value: filters.product, onChange: filters.setProduct, options: [{ value: "all", label: "All products" }, ...products.map((item) => ({ value: item.value, label: `${item.label} (${item.count})` }))] },
        { key: "priority", label: "Priority", value: filters.priority, onChange: filters.setPriority, options: LEAD_PRIORITY_OPTIONS },
        { key: "source", label: "Source", value: filters.source, onChange: filters.setSource, options: sourceOptions },
        { key: "assigned-to", label: "Assigned to", value: filters.assignedTo, onChange: filters.setAssignedTo, options: assigneeOptions, disabled: filters.hasFixedAssigneeScope || (filters.isPlatformConsole && filters.company === "all" && canManage), helperText: filters.hasFixedAssigneeScope ? "This role stays inside your assigned lead scope." : filters.isPlatformConsole && filters.company === "all" ? "Select a tenant before filtering by owner." : "" },
        { key: "workflow-stage", label: "Workflow stage", value: filters.workflowStage, onChange: filters.setWorkflowStage, options: LEAD_WORKFLOW_STAGE_OPTIONS },
        canManage ? { key: "created-by", label: "Created by", value: filters.createdBy, onChange: filters.setCreatedBy, options: createdByOptions, disabled: filters.isPlatformConsole && filters.company === "all", helperText: filters.isPlatformConsole && filters.company === "all" ? "Select a tenant before filtering by creator." : "" } : null,
      ].filter(Boolean),
    [assigneeOptions, canManage, companies, createdByOptions, filters.assignedTo, filters.company, filters.createdBy, filters.hasFixedAssigneeScope, filters.isPlatformConsole, filters.notesSearch, filters.priority, filters.product, filters.setAssignedTo, filters.setCompany, filters.setCreatedBy, filters.setNotesSearch, filters.setPriority, filters.setProduct, filters.setSource, filters.setStatus, filters.setTeamFilter, filters.setWorkflowStage, filters.source, filters.status, filters.teamFilter, filters.workflowStage, products, sourceOptions, statusOptions, teams]
  );
}
