"use client";

export const ROLES = ["admin", "manager", "marketing"];
export const RANGE_OPTIONS = ["week", "month", "quarter", "year"];
export const ANALYTICS_PAGE_SIZE = 1000;
export const ANALYTICS_PAGE_BATCH = 4;

export const STATUS_ORDER = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "closed-won",
];

export const STATUS_TONE = {
  new: "bg-sky-100 text-sky-700 ring-sky-200",
  contacted: "bg-cyan-100 text-cyan-700 ring-cyan-200",
  qualified: "bg-violet-100 text-violet-700 ring-violet-200",
  proposal: "bg-amber-100 text-amber-700 ring-amber-200",
  negotiation: "bg-orange-100 text-orange-700 ring-orange-200",
  "closed-won": "bg-emerald-100 text-emerald-700 ring-emerald-200",
  converted: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  closed: "bg-emerald-100 text-emerald-700 ring-emerald-200",
};

export const WORKFLOW_TONE = {
  sales: "bg-[#fff6e4] text-[#8d6e27] ring-[#eadfcd]",
  legal: "bg-amber-100 text-amber-700 ring-amber-200",
  finance: "bg-orange-100 text-orange-700 ring-orange-200",
  completed: "bg-emerald-100 text-emerald-700 ring-emerald-200",
};

const SOURCE_COLORS = ["#d7b258", "#c47a1d", "#2f6fdd", "#6d46d6", "#0f8c53", "#c4356b"];
const CONVERTED = new Set(["closed-won", "converted", "closed"]);

function matchesFilter(value, filter) {
  return !filter || filter === "all" || String(value || "") === filter;
}

function filterAdvanced(leads, filters = {}) {
  const query = String(filters.query || "").trim().toLowerCase();
  return leads.filter((lead) => {
    const hay = [
      lead.company_name,
      lead.contact_person,
      lead.assigned_to_name,
      lead.product_name,
      lead.lead_source,
      lead.priority,
      lead.email,
      lead.phone,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      (!query || hay.includes(query)) &&
      matchesFilter(lead.assigned_to_name || "Unassigned", filters.owner) &&
      matchesFilter(lead.priority || "medium", filters.priority) &&
      matchesFilter(lead.lead_source || "unknown", filters.source) &&
      matchesFilter(lead.product_name || "Unmapped", filters.product)
    );
  });
}

function buildSelectOptions(leads, key, fallback) {
  return [...new Set(leads.map((lead) => lead[key] || fallback).filter(Boolean))]
    .sort((left, right) => String(left).localeCompare(String(right)))
    .map((value) => ({ value, label: titleize(value) }));
}

export function qp(path, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const serialized = query.toString();
  return serialized ? `${path}?${serialized}` : path;
}

export function titleize(value = "") {
  return String(value || "")
    .replaceAll("_", "-")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function money(value) {
  return `INR ${Number(value || 0).toLocaleString("en-IN")}`;
}

export function compact(value) {
  const num = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    notation: num >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(num);
}

export function when(value, full = false) {
  if (!value) {
    return "--";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(full ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function filterByRange(leads, range) {
  const now = new Date();
  const days = { week: 7, month: 31, quarter: 92, year: 365 }[range] || 31;
  return leads.filter((lead) => {
    const created = new Date(lead.created_at);
    return !Number.isNaN(created.getTime()) && now.getTime() - created.getTime() <= days * 86400000;
  });
}

function buildTrend(leads, range) {
  const now = new Date();
  if (range === "week") {
    return [...Array(7)].map((_, index) => {
      const date = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - index)));
      const label = date.toLocaleDateString("en-IN", { weekday: "short" });
      const items = leads.filter((lead) => startOfDay(lead.created_at).getTime() === date.getTime());
      const closed = items.filter((lead) => CONVERTED.has(lead.status)).length;
      const value = items.reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0);
      return { label, leads: items.length, closed, value };
    });
  }

  const count = range === "month" ? 4 : range === "quarter" ? 3 : 6;
  return [...Array(count)].map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
    const label = date.toLocaleDateString("en-IN", { month: "short" });
    const items = leads.filter((lead) => {
      const created = new Date(lead.created_at);
      return created.getMonth() === date.getMonth() && created.getFullYear() === date.getFullYear();
    });
    const closed = items.filter((lead) => CONVERTED.has(lead.status)).length;
    const value = items.reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0);
    return { label, leads: items.length, closed, value };
  });
}

function buildMix(leads, key, palette = SOURCE_COLORS) {
  const map = new Map();
  leads.forEach((lead) => {
    const bucket = lead[key] || "unknown";
    map.set(bucket, (map.get(bucket) || 0) + 1);
  });
  return [...map.entries()]
    .map(([name, value], index) => ({
      key: name,
      label: titleize(name),
      value,
      color: palette[index % palette.length],
    }))
    .sort((left, right) => right.value - left.value);
}

function buildOwnerBoard(leads) {
  const map = new Map();
  leads.forEach((lead) => {
    const key = lead.assigned_to_name || "Unassigned";
    const current = map.get(key) || { label: key, leads: 0, value: 0 };
    current.leads += 1;
    current.value += Number(lead.estimated_value || 0);
    map.set(key, current);
  });
  return [...map.values()].sort((left, right) => right.leads - left.leads).slice(0, 6);
}

export function buildAnalyticsDeck(leads, range, customerCount, summary, notifications, filters = {}) {
  const rangeLeads = filterByRange(leads, range);
  const filteredLeads = filterAdvanced(rangeLeads, filters);
  const convertedLeads = filteredLeads.filter((lead) => CONVERTED.has(lead.status));
  const openLeads = filteredLeads.filter((lead) => !CONVERTED.has(lead.status));
  const totalValue = filteredLeads.reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0);
  const closedValue = convertedLeads.reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0);
  const trend = buildTrend(filteredLeads, range);
  const statusMix = buildMix(filteredLeads, "status").map((item) => ({ ...item, tone: STATUS_TONE[item.key] || "bg-[#f4efe5] text-[#6f614c] ring-[#e6dccb]" }));
  const workflowMix = buildMix(filteredLeads, "workflow_stage").map((item) => ({ ...item, tone: WORKFLOW_TONE[item.key] || "bg-[#f4efe5] text-[#6f614c] ring-[#e6dccb]" }));
  const sourceMix = buildMix(filteredLeads, "lead_source");
  const ownerBoard = buildOwnerBoard(filteredLeads);
  const focusDefaults = {
    status: statusMix[0]?.key || "new",
    workflow: workflowMix[0]?.key || "sales",
  };
  const recent = summary?.recent_activity?.length
    ? summary.recent_activity
    : (notifications || []).map((item) => ({
        activity_id: item.notif_id,
        activity_type: item.type,
        message: item.message,
        company_name: item.title,
        created_at: item.created_at,
      }));

  return {
    filteredLeads,
    filterOptions: {
      owners: buildSelectOptions(rangeLeads, "assigned_to_name", "Unassigned"),
      priorities: buildSelectOptions(rangeLeads, "priority", "medium"),
      sources: buildSelectOptions(rangeLeads, "lead_source", "unknown"),
      products: buildSelectOptions(rangeLeads, "product_name", "Unmapped"),
    },
    trend,
    statusMix,
    workflowMix,
    sourceMix,
    ownerBoard,
    focusDefaults,
    recent,
    kpis: [
      { label: "Visible Leads", value: compact(filteredLeads.length), hint: "Current lead volume", icon: "users" },
      { label: "Closed Value", value: money(closedValue), hint: "Won inside this range", icon: "finance" },
      { label: "Open Pipeline", value: money(totalValue - closedValue), hint: "Still moving forward", icon: "workflow" },
      { label: "Customers", value: compact(customerCount), hint: "Converted relationships", icon: "customers" },
    ],
    topCards: [
      { label: "Win Rate", value: `${filteredLeads.length ? Math.round((convertedLeads.length / filteredLeads.length) * 100) : 0}%`, hint: "Closed vs visible leads" },
      { label: "Avg Deal", value: money(convertedLeads.length ? closedValue / convertedLeads.length : 0), hint: "Closed deal average" },
      { label: "Active Sources", value: compact(sourceMix.length), hint: "Live acquisition channels" },
      { label: "Open Leads", value: compact(openLeads.length), hint: "Need movement or follow-up" },
    ],
  };
}

export function buildFocusDeck(leads, status, workflow) {
  const matches = leads.filter((lead) => (!status || lead.status === status) && (!workflow || (lead.workflow_stage || "sales") === workflow));
  const overdue = matches.filter((lead) => lead.follow_up_date && new Date(lead.follow_up_date).getTime() < Date.now()).length;
  const noOwner = matches.filter((lead) => !lead.assigned_to_name).length;
  const totalValue = matches.reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0);
  return {
    leads: matches.sort((left, right) => Number(right.estimated_value || 0) - Number(left.estimated_value || 0)),
    metrics: [
      { label: "Focused Leads", value: compact(matches.length) },
      { label: "Focused Value", value: money(totalValue) },
      { label: "Overdue Follow-up", value: compact(overdue) },
      { label: "No Owner", value: compact(noOwner) },
    ],
  };
}

export function buildAnalyticsCsv(deck, range, focusDeck) {
  const rows = [
    ["Metric", "Value"],
    ...deck.kpis.map((item) => [item.label, item.value]),
    [""],
    ["Trend", "Leads", "Closed", "Value"],
    ...deck.trend.map((item) => [item.label, item.leads, item.closed, item.value]),
    [""],
    ["Focused Lead", "Company", "Contact", "Status", "Workflow", "Value"],
    ...focusDeck.leads.slice(0, 20).map((lead) => [
      lead.lead_id,
      lead.company_name || "",
      lead.contact_person || "",
      lead.status || "",
      lead.workflow_stage || "",
      lead.estimated_value || 0,
    ]),
  ];
  return {
    name: `analytics-${range}-${new Date().toISOString().slice(0, 10)}.csv`,
    content: rows.map((row) => row.join(",")).join("\n"),
  };
}
