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
// Every number follows the team, person, product, source, date and search filters; `info` says what it counts.
const pct = (part, whole) => (whole ? `${Math.round((part / whole) * 100)}%` : "0%");
export const LEAD_CARDS = [
  { key: "advance", group: "Money", label: "Payment received", tone: "green", value: (c) => moneyShort(c.advance_received), hint: (c) => `From ${n(c.paid_leads)} paying leads`,
    info: "All money entered as received (the \"Advance received\" field) on these leads." },
  { key: "pending", group: "Money", label: "Payment pending", tone: "gold", value: (c) => moneyShort(c.pending_amount), hint: () => "Still to collect on won deals",
    info: "On won and onboarded deals only: deal value minus payment received. Open leads are not counted; their value is in Open pipeline." },
  { key: "leadValue", group: "Money", label: "Total lead value", tone: "brand", value: (c) => moneyShort(c.lead_value), hint: (c) => `Across ${n(c.total)} leads`,
    info: "The lead value of every lead here, whatever its status: open, won and lost together." },
  { key: "pipeline", group: "Money", label: "Open pipeline", tone: "brand", view: "open", value: (c) => moneyShort(c.pipeline_value), hint: (c) => `${n(c.open_leads)} open leads`,
    info: "Lead value of leads still open (not won, not lost). Business that may come in, not money received. Click to see these leads." },
  { key: "today", group: "Work", label: "Follow-ups today", view: "today", value: (c) => n(c.today), hint: () => "Calls planned for today",
    info: "Leads with a follow-up date today. Click to open the list and start calling." },
  { key: "overdue", group: "Work", label: "Overdue follow-ups", tone: "danger", view: "overdue", value: (c) => n(c.overdue), hint: (c) => `${pct(c.overdue, c.open_leads)} of open leads`,
    info: "Open leads whose follow-up date has passed. The customer is waiting for a call. Click to see them, oldest first." },
  { key: "stale", group: "Work", label: "Not updated in 7 days", tone: "gold", view: "stale", value: (c) => n(c.stale), hint: () => "Open leads going quiet",
    info: "Open leads with no change or note for 7 days. These are the ones most likely to be lost." },
  { key: "high", group: "Work", label: "High priority open", view: "high", value: (c) => n(c.high_priority), hint: () => "Open, marked high or urgent",
    info: "Open leads marked High or Urgent priority." },
  { key: "deleted", group: "Work", label: "Deleted leads", tone: "danger", href: "/leads/deleted", managerOnly: true, value: (c) => n(c.deleted), hint: () => "See why, or restore",
    info: "Leads someone archived. Open the list to see who did it and why, and to restore any of them." },
  { key: "unassigned", group: "Work", label: "No owner", view: "unassigned", managerOnly: true, value: (c) => n(c.unassigned), hint: () => "Nobody is working these",
    info: "Leads with no owner, so nobody gets their reminders. Click to assign them." },
  { key: "total", group: "Results", label: "Total leads", view: "all", value: (c) => n(c.total), hint: (c) => `${n(c.new_this_week)} added in 7 days`,
    info: "Every lead here, any status. Deleted leads are not counted." },
  { key: "newWeek", group: "Results", label: "Added in last 7 days", value: (c) => n(c.new_this_week), hint: () => "New leads this week",
    info: "Leads created in the last 7 days, including today." },
  { key: "won", group: "Results", label: "Won deals", tone: "green", view: "won", value: (c) => n(c.won), hint: (c) => `${pct(c.won, c.won + c.lost)} win rate`,
    info: "Leads marked Closed won or Onboarded. Win rate = won ÷ (won + lost), so leads still open do not pull it down." },
  { key: "lost", group: "Results", label: "Lost deals", value: (c) => n(c.lost), hint: () => "Marked closed lost",
    info: "Leads marked Closed lost." },
  { key: "winRate", group: "Results", label: "Win rate", tone: "brand", value: (c) => pct(c.won, c.won + c.lost), hint: (c) => `${n(c.won)} won of ${n(c.won + c.lost)} closed`,
    info: "Out of the deals that are decided (won or lost), how many were won. Open leads are left out." },
  { key: "wfActive", group: "Workflow", label: "In legal or finance", value: (c, meta) => n(workflow(meta).active_workflow_leads), hint: () => "Won deals being processed",
    info: "Won deals that legal or finance are still working on." },
  { key: "wfDone", group: "Workflow", label: "Workflow completed", tone: "green", value: (c, meta) => n(workflow(meta).completed_workflow_leads), hint: () => "Approved or completed",
    info: "Won deals that legal and finance have approved or finished." },
  { key: "wfReceived", group: "Workflow", label: "Workflow payment received", tone: "green", value: (c, meta) => moneyShort(workflow(meta).total_advance_received), hint: () => "On deals in legal or finance",
    info: "Money received on deals that are in the legal or finance workflow." },
  { key: "wfPending", group: "Workflow", label: "Workflow payment pending", tone: "gold", value: (c, meta) => moneyShort(workflow(meta).total_remaining_payment), hint: () => "Still to collect in workflow",
    info: "Money still to collect on deals that are in the legal or finance workflow." },
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
    { key: "won", label: "Won", count: "won", filters: { status: "won" } },
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
