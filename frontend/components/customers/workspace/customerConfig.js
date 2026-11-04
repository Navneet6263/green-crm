// Customers workspace: what the table can show, the tiles on top, quick filters and Excel presets.

export const money = (v) => {
  const n = Number(v || 0);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(n >= 100000000 ? 0 : 1)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(n >= 1000000 ? 0 : 1)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
};
export const fullMoney = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;
export const pendingOf = (c) => Math.max(0, Number(c.total_value || 0) - Number(c.paid_amount || 0));
export const day = (v, opts = { day: "numeric", month: "short", year: "numeric" }) => (v ? new Date(v).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", ...opts }) : "");
export const daysUntil = (v) => (v ? Math.ceil((new Date(v).getTime() - Date.now()) / 86400000) : null);
export const titleize = (v) => String(v || "").replace(/[-_]/g, " ").replace(/\b\w/g, (x) => x.toUpperCase());

export const HEALTH = {
  good: { label: "Healthy", dot: "bg-emerald-500", tone: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  watch: { label: "Watch", dot: "bg-amber-500", tone: "bg-amber-50 text-amber-800 ring-amber-100" },
  risk: { label: "At risk", dot: "bg-rose-500", tone: "bg-rose-50 text-rose-700 ring-rose-100" },
  inactive: { label: "Inactive", dot: "bg-slate-400", tone: "bg-slate-100 text-slate-600 ring-slate-200" },
};

export const ONBOARDING = {
  pending: { label: "Not started", tone: "bg-slate-100 text-slate-600", bar: "bg-slate-300" },
  "in-progress": { label: "In progress", tone: "bg-sky-50 text-sky-700", bar: "bg-sky-500" },
  training: { label: "In progress", tone: "bg-sky-50 text-sky-700", bar: "bg-sky-500" },
  done: { label: "Onboarded", tone: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-500" },
  completed: { label: "Onboarded", tone: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-500" },
};
export const onboardingOf = (status) => ONBOARDING[String(status || "pending").toLowerCase()] || ONBOARDING.pending;

// Tiles double as filters: clicking one shows only those customers.
export const KPIS = [
  { key: "total", label: "Customers", icon: "customers", color: "#3b6fd8", value: (s) => s.total, hint: (s) => `${s.active || 0} active`, filter: {} },
  { key: "pending", label: "Money pending", icon: "money", color: "#e06a10", money: true, value: (s) => s.pending_amount, hint: (s) => `${s.pending_count || 0} customers owe money`, filter: { payment: "pending" } },
  { key: "overdue", label: "Payment overdue", icon: "alarm", color: "#e11d48", value: (s) => s.payment_overdue, hint: () => "Past the due date", filter: { payment: "overdue" }, alert: true },
  { key: "collected", label: "Collected", icon: "check", color: "#059669", money: true, value: (s) => s.collected, hint: (s) => `of ${money(s.value)} contract value`, filter: {} },
  { key: "onboarding", label: "Onboarding", icon: "rocket", color: "#8a55e6", value: (s) => Number(s.onboarding_pending || 0) + Number(s.onboarding_in_progress || 0), hint: (s) => `${s.onboarding_in_progress || 0} in progress · ${s.onboarding_done || 0} done`, filter: { onboarding: "in-progress" } },
  { key: "renewals", label: "Renewals in 30 days", icon: "calendar", color: "#b98300", value: (s) => s.renewals_soon, hint: (s) => `${s.renewals_expired || 0} already expired`, filter: { renewal: "soon" } },
  { key: "attention", label: "Need attention", icon: "flag", color: "#d9467c", value: (s) => s.attention, hint: () => "Overdue money, follow-up or plan", filter: { attention: "yes" }, alert: true },
];

export const QUICK_FILTERS = [
  ["all", "All", {}],
  ["attention", "Need attention", { attention: "yes" }],
  ["pending", "Money pending", { payment: "pending" }],
  ["overdue", "Payment overdue", { payment: "overdue" }],
  ["onb-pending", "Not onboarded", { onboarding: "pending" }],
  ["onb-progress", "Onboarding", { onboarding: "in-progress" }],
  ["onboarded", "Onboarded", { onboarding: "done" }],
  ["renewal", "Renewal soon", { renewal: "soon" }],
  ["expired", "Plan expired", { renewal: "expired" }],
  ["followup", "Follow-up overdue", { follow_up: "overdue" }],
];

export const SORTS = [["recent", "Recently updated"], ["pending", "Most money pending"], ["payment-date", "Payment due soonest"], ["renewal", "Renewal soonest"], ["value", "Highest value"], ["name", "Company name"], ["follow-up", "Follow-up date"]];

// Table columns; `fixed` ones are always shown.
export const COLUMNS = [
  { key: "customer", label: "Customer", fixed: true },
  { key: "owner", label: "Owner" },
  { key: "health", label: "Health" },
  { key: "onboarding", label: "Onboarding" },
  { key: "money", label: "Paid / value" },
  { key: "pending", label: "Pending" },
  { key: "due", label: "Next payment" },
  { key: "renewal", label: "Renewal" },
  { key: "followup", label: "Follow-up" },
  { key: "product", label: "Product" },
  { key: "team", label: "Team" },
  { key: "since", label: "Customer since" },
];
export const DEFAULT_COLUMNS = ["customer", "owner", "health", "onboarding", "money", "pending", "due", "renewal"];

export const REPORT_PRESETS = [
  { key: "collections", label: "Collections", description: "Who owes money, and every payment", layout: { sheets: ["summary", "pending", "payments"] } },
  { key: "onboarding", label: "Onboarding review", description: "Checklist grid and onboarding status", layout: { sheets: ["onboarding", "customers"], options: { customers: { group: "onboarding" } } } },
  { key: "renewals", label: "Renewals", description: "Plans ending soonest", layout: { sheets: ["renewals", "customers"] } },
  { key: "owners", label: "By owner", description: "Customers grouped by owner", layout: { sheets: ["summary", "customers"], options: { customers: { group: "owner" } } } },
  { key: "all", label: "Everything", description: "All sheets", layout: { sheets: ["summary", "customers", "pending", "payments", "onboarding", "renewals"] } },
];
