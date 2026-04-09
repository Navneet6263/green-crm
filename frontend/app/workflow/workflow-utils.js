"use client";

export const ALLOWED_ROLES = ["super-admin", "platform-admin", "platform-manager", "admin", "manager"];
export const WORKFLOW_PAGE_SIZE = 80;
export const WORKFLOW_BATCH = 4;

export const STATUS_TONE = {
  new: "bg-sky-100 text-sky-700 ring-sky-200",
  contacted: "bg-cyan-100 text-cyan-700 ring-cyan-200",
  qualified: "bg-violet-100 text-violet-700 ring-violet-200",
  proposal: "bg-amber-100 text-amber-700 ring-amber-200",
  negotiation: "bg-orange-100 text-orange-700 ring-orange-200",
  "closed-won": "bg-emerald-100 text-emerald-700 ring-emerald-200",
  won: "bg-emerald-100 text-emerald-700 ring-emerald-200",
};

export const WORKFLOW_TONE = {
  sales: "bg-[#fff6e4] text-[#8d6e27] ring-[#eadfcd]",
  legal: "bg-amber-100 text-amber-700 ring-amber-200",
  finance: "bg-orange-100 text-orange-700 ring-orange-200",
  completed: "bg-emerald-100 text-emerald-700 ring-emerald-200",
};

export const PRIORITY_TONE = {
  low: "bg-sky-100 text-sky-700 ring-sky-200",
  medium: "bg-amber-100 text-amber-700 ring-amber-200",
  high: "bg-rose-100 text-rose-700 ring-rose-200",
  urgent: "bg-[#10111d] text-white ring-[#10111d]",
};

function matchesFilter(value, filter) {
  return !filter || filter === "all" || String(value || "") === String(filter);
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

export function formatDuration(minutes) {
  const value = Number(minutes || 0);
  if (!value) {
    return "Live";
  }
  if (value < 60) {
    return `${value}m`;
  }
  if (value < 1440) {
    return `${Math.floor(value / 60)}h ${value % 60}m`;
  }
  const days = Math.floor(value / 1440);
  const hours = Math.floor((value % 1440) / 60);
  return `${days}d ${hours}h`;
}

function buildOptions(leads, key, fallback) {
  return [...new Set(leads.map((lead) => lead[key] || fallback).filter(Boolean))]
    .sort((left, right) => String(left).localeCompare(String(right)))
    .map((value) => ({ value, label: titleize(value) }));
}

function buildMix(leads, key) {
  const map = new Map();
  leads.forEach((lead) => {
    const bucket = lead[key] || "unknown";
    map.set(bucket, (map.get(bucket) || 0) + 1);
  });
  return [...map.entries()]
    .map(([keyValue, value]) => ({ key: keyValue, label: titleize(keyValue), value }))
    .sort((left, right) => right.value - left.value);
}

export function filterWorkflowQueue(leads, filters = {}) {
  const query = String(filters.query || "").trim().toLowerCase();
  return leads.filter((lead) => {
    const hay = [
      lead.company_name,
      lead.contact_person,
      lead.assigned_to_name,
      lead.legal_owner_name,
      lead.finance_owner_name,
      lead.lead_source,
      lead.product_name,
      lead.priority,
      lead.status,
      lead.workflow_stage,
      lead.email,
      lead.phone,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const owner = lead.assigned_to_name || lead.legal_owner_name || lead.finance_owner_name || "Unassigned";
    return (
      (!query || hay.includes(query)) &&
      matchesFilter(lead.workflow_stage || "sales", filters.stage) &&
      matchesFilter(lead.status || "new", filters.status) &&
      matchesFilter(owner, filters.owner) &&
      matchesFilter(lead.priority || "medium", filters.priority) &&
      matchesFilter(lead.lead_source || "unknown", filters.source)
    );
  });
}

export function buildWorkflowDeck(leads, filters = {}) {
  const filteredLeads = filterWorkflowQueue(leads, filters);
  const overdue = filteredLeads.filter((lead) => lead.follow_up_date && new Date(lead.follow_up_date).getTime() < Date.now()).length;
  const noOwner = filteredLeads.filter((lead) => !(lead.assigned_to_name || lead.legal_owner_name || lead.finance_owner_name)).length;
  const docGap = filteredLeads.filter((lead) => ["legal", "finance"].includes(lead.workflow_stage) && Number(lead.doc_count || 0) === 0).length;
  const readyForLegal = filteredLeads.filter((lead) => lead.status === "closed-won" && (lead.workflow_stage || "sales") === "sales").length;
  const totalValue = filteredLeads.reduce((sum, lead) => sum + Number(lead.estimated_value || lead.invoice_amount || 0), 0);

  return {
    filteredLeads,
    statusMix: buildMix(filteredLeads, "status"),
    stageMix: buildMix(filteredLeads, "workflow_stage"),
    sourceMix: buildMix(filteredLeads, "lead_source"),
    filterOptions: {
      owners: buildOptions(leads.map((lead) => ({
        assigned_to_name: lead.assigned_to_name || lead.legal_owner_name || lead.finance_owner_name || "Unassigned",
      })), "assigned_to_name", "Unassigned"),
      priorities: buildOptions(leads, "priority", "medium"),
      sources: buildOptions(leads, "lead_source", "unknown"),
    },
    kpis: [
      { label: "Tracked Leads", value: compact(filteredLeads.length), hint: "Visible workflow queue", icon: "workflow" },
      { label: "Queue Value", value: money(totalValue), hint: "Commercial weight inside tracker", icon: "finance" },
      { label: "Overdue Follow-up", value: compact(overdue), hint: "Needs immediate movement", icon: "calendar" },
      { label: "Doc Gaps", value: compact(docGap), hint: "Legal or finance without docs", icon: "documents" },
    ],
    topCards: [
      { label: "Ready For Legal", value: compact(readyForLegal), hint: "Closed-won still in sales stage" },
      { label: "No Owner", value: compact(noOwner), hint: "Needs accountable owner" },
      { label: "Legal Queue", value: compact(filteredLeads.filter((lead) => lead.workflow_stage === "legal").length), hint: "Agreement review stage" },
      { label: "Finance Queue", value: compact(filteredLeads.filter((lead) => lead.workflow_stage === "finance").length), hint: "Invoice and closure stage" },
    ],
  };
}

export function buildLeadAnalysis(lead) {
  if (!lead) {
    return null;
  }

  let score = 48;
  const flags = [];

  if (lead.follow_up_date && new Date(lead.follow_up_date).getTime() < Date.now()) {
    score += 20;
    flags.push("Follow-up overdue");
  }
  if (!lead.assigned_to_name && !lead.legal_owner_name && !lead.finance_owner_name) {
    score += 18;
    flags.push("Owner missing");
  }
  if (["legal", "finance"].includes(lead.workflow_stage) && !(lead.legal_documents?.length || lead.finance_documents?.length)) {
    score += 15;
    flags.push("Workflow docs missing");
  }
  if ((lead.workflow_stage || "sales") === "sales" && lead.status === "closed-won") {
    score += 12;
    flags.push("Ready for legal");
  }
  if (!lead.latest_note) {
    score += 8;
    flags.push("Fresh note missing");
  }

  const tone = score >= 82 ? "Critical" : score >= 64 ? "Watch" : "Stable";
  const customerSignal =
    (lead.workflow_stage || "sales") === "completed"
      ? "Commercial workflow completed"
      : lead.status === "closed-won" && (lead.workflow_stage || "sales") === "sales"
        ? "Closed-won, ready for legal handoff"
        : lead.workflow_stage === "legal"
          ? "Legal review in motion"
          : lead.workflow_stage === "finance"
            ? "Finance completion in progress"
            : "Lead still inside commercial selling motion";

  return {
    score,
    tone,
    flags,
    customerSignal,
    metrics: [
      { label: "Attention Score", value: `${score}/100` },
      { label: "Workflow Tone", value: tone },
      { label: "Doc Count", value: compact((lead.legal_documents?.length || 0) + (lead.finance_documents?.length || 0)) },
      { label: "Last Follow-up", value: when(lead.follow_up_date, true) },
    ],
  };
}
