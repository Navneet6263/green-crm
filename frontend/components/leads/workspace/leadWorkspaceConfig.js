// Columns, saved views and report layouts for the Leads page.
const IST_OFFSET_MS = 330 * 60 * 1000;

export const istDayKey = (value) => new Date(new Date(value).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
export const formatDay = (value, options = { day: "numeric", month: "short" }) =>
  value ? new Date(value).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", ...options }) : "";
export const formatClock = (value) =>
  new Date(value).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true }).replace(" ", "").toLowerCase();

/** "overdue" | "today" | "upcoming" | "" for a lead's follow-up date. */
export function followUpState(lead) {
  if (!lead?.follow_up_date) return "";
  const today = istDayKey(Date.now());
  const day = istDayKey(lead.follow_up_date);
  if (day < today) return ["closed-won", "closed-lost"].includes(lead.status) ? "" : "overdue";
  return day === today ? "today" : "upcoming";
}

export const moneyShort = (value) => {
  const n = Number(value || 0);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(n >= 100000000 ? 0 : 1)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(n >= 1000000 ? 0 : 1)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
};

// `sort` is the server's sort key; columns without one cannot be sorted.
export const LEAD_COLUMNS = [
  { key: "lead", label: "Lead", sort: "company_name", fixed: true, width: "min-w-[190px]" },
  { key: "status", label: "Status", sort: "status", width: "w-[160px]" },
  { key: "priority", label: "Priority", sort: "priority", width: "w-[92px]" },
  { key: "owner", label: "Owner", sort: "assigned_to_name", width: "min-w-[110px]" },
  { key: "followUp", label: "Follow-up", sort: "follow_up_date", width: "min-w-[86px]" },
  { key: "value", label: "Value", sort: "estimated_value", align: "right", width: "w-[96px]" },
  { key: "phone", label: "Phone", width: "w-[120px]" },
  { key: "product", label: "Product", width: "min-w-[120px]" },
  { key: "source", label: "Source", width: "min-w-[100px]" },
  { key: "team", label: "Team", width: "min-w-[110px]" },
  { key: "advance", label: "Advance", align: "right", width: "w-[96px]" },
  { key: "total", label: "Total value", align: "right", width: "w-[96px]" },
  { key: "pending", label: "Pending", align: "right", width: "w-[96px]" },
  { key: "paymentMode", label: "Payment mode", width: "min-w-[100px]" },
  { key: "paymentDate", label: "Payment date", width: "w-[96px]" },
  { key: "nextPayment", label: "Next payment", width: "w-[96px]" },
  { key: "email", label: "Email", width: "min-w-[170px]" },
  { key: "note", label: "Latest note", width: "min-w-[220px]" },
  { key: "notes", label: "Notes", align: "right", width: "w-[64px]" },
  { key: "createdBy", label: "Created by", width: "min-w-[120px]" },
  { key: "created", label: "Created", sort: "created_at", width: "w-[92px]" },
  { key: "updated", label: "Last update", sort: "updated_at", width: "w-[100px]" },
];
export const DEFAULT_COLUMNS = ["lead", "status", "priority", "owner", "followUp", "value", "phone", "updated"];

const n = (value) => Number(value || 0).toLocaleString("en-IN");
const workflow = (meta) => meta?.workflow_summary || {};

// Cards a person can show on the Leads page. `view` makes the card filter the list.
export const LEAD_CARDS = [
  { key: "advance", group: "Money", label: "Advance received", tone: "green", value: (c) => moneyShort(c.advance_received), hint: (c) => `From ${n(c.paid_leads)} leads` },
  { key: "pending", group: "Money", label: "Pending amount", tone: "gold", value: (c) => moneyShort(c.pending_amount), hint: () => "Value still to collect" },
  { key: "leadValue", group: "Money", label: "Total lead value", tone: "brand", value: (c) => moneyShort(c.lead_value), hint: (c) => `${n(c.total)} leads` },
  { key: "pipeline", group: "Money", label: "Open pipeline", tone: "brand", view: "open", value: (c) => moneyShort(c.pipeline_value), hint: (c) => `${n(c.open_leads)} open leads` },
  { key: "today", group: "Work", label: "Today's follow-ups", view: "today", value: (c) => n(c.today), hint: () => "Due today" },
  { key: "overdue", group: "Work", label: "Overdue", tone: "danger", view: "overdue", value: (c) => n(c.overdue), hint: () => "Past the follow-up date" },
  { key: "stale", group: "Work", label: "No update in 7 days", tone: "gold", view: "stale", value: (c) => n(c.stale), hint: () => "Open leads going quiet" },
  { key: "high", group: "Work", label: "High priority", view: "high", value: (c) => n(c.high_priority), hint: () => "Open, high or urgent" },
  { key: "deleted", group: "Work", label: "Deleted leads", tone: "danger", href: "/leads/deleted", managerOnly: true, value: (c) => n(c.deleted), hint: () => "See why, or restore" },
  { key: "unassigned", group: "Work", label: "Unassigned", view: "unassigned", managerOnly: true, value: (c) => n(c.unassigned), hint: () => "Need an owner" },
  { key: "total", group: "Results", label: "Total leads", view: "all", value: (c) => n(c.total), hint: (c) => `${n(c.new_this_week)} new this week` },
  { key: "newWeek", group: "Results", label: "New this week", value: (c) => n(c.new_this_week), hint: () => "Last 7 days" },
  { key: "won", group: "Results", label: "Won", tone: "green", view: "won", value: (c) => n(c.won), hint: () => "Closed won" },
  { key: "lost", group: "Results", label: "Lost", value: (c) => n(c.lost), hint: () => "Closed lost" },
  { key: "winRate", group: "Results", label: "Win rate", tone: "brand", value: (c) => `${c.won + c.lost ? Math.round((c.won / (c.won + c.lost)) * 100) : 0}%`, hint: () => "Won out of closed" },
  { key: "wfActive", group: "Workflow", label: "Active workflows", value: (c, meta) => n(workflow(meta).active_workflow_leads), hint: () => "In progress" },
  { key: "wfDone", group: "Workflow", label: "Completed workflows", tone: "green", value: (c, meta) => n(workflow(meta).completed_workflow_leads), hint: () => "Approved or completed" },
  { key: "wfReceived", group: "Workflow", label: "Workflow received", tone: "green", value: (c, meta) => moneyShort(workflow(meta).total_advance_received), hint: () => "Advance on workflow leads" },
  { key: "wfPending", group: "Workflow", label: "Workflow pending", tone: "gold", value: (c, meta) => moneyShort(workflow(meta).total_remaining_payment), hint: () => "Remaining on workflow leads" },
];
export const DEFAULT_CARDS = ["advance", "pending", "pipeline", "today", "overdue", "won", "deleted"];

/** Built-in views. `filters` uses the same names as useLeadFilterState's snapshot. */
export function builtInViews({ canManage, userId }) {
  return [
    { key: "all", label: "All leads", filters: {} },
    ...(canManage && userId ? [{ key: "mine", label: "My leads", filters: { assignedTo: userId } }] : []),
    { key: "today", label: "Today's follow-ups", count: "today", filters: { followUp: "today" } },
    { key: "overdue", label: "Overdue", count: "overdue", tone: "danger", filters: { followUp: "overdue" } },
    { key: "open", label: "Open pipeline", count: "open_leads", filters: { status: "active" } },
    { key: "high", label: "High priority", count: "high_priority", filters: { status: "active", priority: "high-urgent" } },
    { key: "stale", label: "No update in 7 days", count: "stale", filters: { stale: true } },
    ...(canManage ? [{ key: "unassigned", label: "Unassigned", count: "unassigned", filters: { status: "unassigned" } }] : []),
    { key: "won", label: "Won", count: "won", filters: { status: "closed-won" } },
  ];
}

export const LEAD_REPORT_PRESETS = [
  { key: "standard", label: "Sales report", description: "Summary, leads, owners and sources", layout: { sheets: ["summary", "leads", "owners", "sources"] } },
  {
    key: "calls", label: "Calling sheet", description: "Name, phone, status and last note, by owner",
    layout: { sheets: ["leads"], columns: { leads: ["company", "contact", "phone", "status", "priority", "followUp", "latestNote"] }, options: { leads: { group: "owner" } } },
  },
  { key: "manager", label: "Manager review", description: "Owners, sources, products and the funnel", layout: { sheets: ["summary", "owners", "sources", "products", "funnel"] } },
  { key: "followups", label: "Overdue follow-ups", description: "Who to call first", layout: { sheets: ["followups"], options: { followups: { which: "overdue" } } } },
  { key: "payments", label: "Payments pending", description: "Value, advance and pending amount", layout: { sheets: ["summary", "payments"] } },
  { key: "history", label: "Lead history", description: "One row per lead with Update 1, 2, 3…", layout: { sheets: ["history"], options: { history: { updates: "10" } } } },
];
