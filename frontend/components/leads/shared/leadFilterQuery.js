"use client";

function readValue(searchParams, key) {
  const value = searchParams?.get?.(key);
  return value ? String(value).trim() : "";
}

export function parseLeadFilterSearchParams(searchParams) {
  const quickFilter = readValue(searchParams, "quick_filter") || readValue(searchParams, "quickFilter");
  const status = readValue(searchParams, "status");

  return {
    assignedTo: readValue(searchParams, "assigned_to") || "all",
    company: readValue(searchParams, "company_id") || "all",
    createdBy: readValue(searchParams, "created_by") || "all",
    fromDate: readValue(searchParams, "from_date"),
    priority: readValue(searchParams, "priority") || "all",
    product: readValue(searchParams, "product_id") || "all",
    search: readValue(searchParams, "search"),
    source: readValue(searchParams, "lead_source") || readValue(searchParams, "source") || "all",
    status: status || quickFilter || "all",
    teamFilter: readValue(searchParams, "team_ids") || "all",
    toDate: readValue(searchParams, "to_date"),
    workflowStage: readValue(searchParams, "workflow_stage") || "all",
    syncKey: searchParams?.toString?.() || "",
  };
}
