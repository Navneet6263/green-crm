export const LEAD_STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Open pipeline" },
  { value: "pending", label: "New + pending" },
  { value: "assigned", label: "Assigned" },
  { value: "unassigned", label: "Unassigned" },
  { value: "transferred", label: "Transferred" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
  { value: "closed-won", label: "Closed won" },
  { value: "closed-lost", label: "Closed lost" },
];

export const LEAD_PRIORITY_OPTIONS = [
  { value: "all", label: "All priorities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const LEAD_WORKFLOW_STAGE_OPTIONS = [
  { value: "all", label: "All stages" },
  { value: "sales", label: "Sales" },
  { value: "legal", label: "Legal" },
  { value: "finance", label: "Finance" },
  { value: "completed", label: "Completed" },
];

export const LEAD_DATE_PRESET_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "last-7", label: "Last 7 days" },
  { value: "last-30", label: "Last 30 days" },
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "custom", label: "Custom range" },
];
