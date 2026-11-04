// Dashboard widgets: who may add them, and what each role sees by default.
export const TEAM_ROLES = ["admin", "manager"];

export const WIDGETS = [
  { key: "kpis", title: "Key numbers", description: "Leads added, won, pipeline, overdue and today", roles: ["admin", "manager", "sales", "marketing", "legal-team", "finance-team", "support", "viewer"], size: "full" },
  { key: "myday", title: "My day", description: "Your overdue and today's follow-ups, and tasks", roles: ["admin", "manager", "sales", "marketing", "support"], size: "full" },
  { key: "team", title: "Team performance", description: "Top people by leads, won, open and overdue", roles: TEAM_ROLES, size: "half" },
  { key: "sources", title: "Lead sources", description: "Where leads came from and how many converted", roles: ["admin", "manager", "sales", "marketing", "legal-team", "finance-team", "support", "viewer"], size: "half" },
  { key: "trend", title: "Leads over time", description: "Leads added and won, day by day", roles: ["admin", "manager", "sales", "marketing", "legal-team", "finance-team", "support", "viewer"], size: "half" },
  { key: "funnel", title: "Status of new leads", description: "Leads added in the period, by status now", roles: ["admin", "manager", "sales", "marketing", "legal-team", "finance-team", "support", "viewer"], size: "half" },
  { key: "products", title: "Products", description: "Leads and won per product", roles: ["admin", "manager", "sales", "marketing", "legal-team", "finance-team", "support", "viewer"], size: "half" },
  { key: "usage", title: "CRM use", description: "Who is active and who has gone quiet", roles: TEAM_ROLES, size: "half" },
  { key: "payments", title: "Payments", description: "Advance, pending and payments due soon", roles: ["admin", "manager", "sales", "marketing", "finance-team"], size: "half" },
  { key: "workflow", title: "Legal & finance", description: "Won deals moving through legal and finance", roles: ["admin", "manager", "legal-team", "finance-team"], size: "half" },
  { key: "recent", title: "Recent updates", description: "Latest notes on leads and customers", roles: ["admin", "manager", "sales", "marketing", "legal-team", "finance-team", "support", "viewer"], size: "half" },
];

const DEFAULTS = {
  admin: ["kpis", "team", "sources", "trend", "usage", "payments", "funnel", "products", "workflow", "recent"],
  manager: ["kpis", "myday", "team", "sources", "trend", "usage", "funnel", "recent"],
  sales: ["kpis", "myday", "sources", "trend", "funnel", "payments", "recent"],
  marketing: ["kpis", "sources", "trend", "products", "funnel", "myday", "recent"],
  "legal-team": ["kpis", "workflow", "funnel", "recent"],
  "finance-team": ["kpis", "workflow", "payments", "funnel", "recent"],
  support: ["kpis", "myday", "sources", "funnel", "recent"],
  viewer: ["kpis", "sources", "trend", "funnel", "recent"],
};

export const widgetsFor = (role) => WIDGETS.filter((w) => w.roles.includes(role));
export const defaultLayout = (role) => (DEFAULTS[role] || DEFAULTS.viewer).map((key) => ({ key, size: WIDGETS.find((w) => w.key === key).size }));

// Checked for colour-blind safety; used in this order, never cycled.
export const PALETTE = ["#009a8c", "#3b6fd8", "#d9467c", "#b98300", "#8a55e6", "#e06a10"];
export const PALETTE_NAMES = ["Teal", "Blue", "Pink", "Gold", "Violet", "Orange"];

// "Build your own chart": what to group by and what to count. Mirrors the server's fixed lists.
export const CHART_DIMENSIONS = [
  ["source", "Lead source"], ["status", "Status"], ["product", "Product"], ["owner", "Person", TEAM_ROLES], ["team", "Team", TEAM_ROLES],
  ["priority", "Priority"], ["city", "City"], ["state", "State"], ["industry", "Industry"], ["month", "Month added"],
];
export const CHART_MEASURES = [
  ["count", "Number of leads"], ["won", "Won deals"], ["open", "Still open"], ["lost", "Lost"],
  ["value", "Estimated value", "money"], ["won_value", "Won value", "money"], ["advance", "Advance received", "money"], ["pending", "Payment pending", "money"],
];
export const CHART_TYPES = [["bars", "Bars"], ["columns", "Columns"], ["table", "Table"]];
export const CHART_IDEAS = [
  { title: "Leads by city", dimension: "city", measure: "count", chart: "bars", color: 1 },
  { title: "Won deals by person", dimension: "owner", measure: "won", chart: "bars", color: 0 },
  { title: "Payment pending by person", dimension: "owner", measure: "pending", chart: "bars", color: 5 },
  { title: "Leads per month", dimension: "month", measure: "count", chart: "columns", color: 1 },
  { title: "Won value by product", dimension: "product", measure: "won_value", chart: "bars", color: 4 },
  { title: "Leads by priority", dimension: "priority", measure: "count", chart: "table", color: 2 },
  { title: "Open leads by state", dimension: "state", measure: "open", chart: "bars", color: 3 },
];

export const RANGES = [
  ["all", "All time"], ["today", "Today"], ["7d", "7 days"], ["30d", "30 days"], ["month", "This month"], ["lastMonth", "Last month"], ["quarter", "90 days"], ["custom", "Custom"],
];

const IST_MS = 330 * 60000;
export const istToday = () => new Date(Date.now() + IST_MS).toISOString().slice(0, 10);
const shift = (key, days) => new Date(new Date(`${key}T00:00:00Z`).getTime() + days * 86400000).toISOString().slice(0, 10);

export function rangeFor(preset, custom) {
  const today = istToday();
  if (preset === "all") return { all: true, from: null, to: today };
  if (preset === "today") return { from: today, to: today };
  if (preset === "7d") return { from: shift(today, -6), to: today };
  if (preset === "month") return { from: `${today.slice(0, 8)}01`, to: today };
  if (preset === "lastMonth") { const end = shift(`${today.slice(0, 8)}01`, -1); return { from: `${end.slice(0, 8)}01`, to: end }; }
  if (preset === "quarter") return { from: shift(today, -89), to: today };
  if (preset === "custom" && custom?.from && custom?.to) return custom;
  return { from: shift(today, -29), to: today };
}

export const fmtDay = (key, options = { day: "numeric", month: "short" }) => (key ? new Date(`${String(key).slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", ...options }) : "");
export const fmtMonth = (key) => (key ? new Date(`${String(key).slice(0, 7)}-01T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", month: "short", year: "numeric" }) : "");
/** Server query and lead-list link params for the period ("All time" sends no dates). */
export const periodQuery = (range) => (range.all ? { period: "all" } : { from: range.from, to: range.to });
export const periodLink = (range) => (range.all ? {} : { from_date: range.from, to_date: range.to, date_filter_type: "created_at" });
export const rangeText = (range, options = { day: "numeric", month: "short", year: "numeric" }) => (range.all ? "All time" : `${fmtDay(range.from, options)} – ${fmtDay(range.to, options)}`);
/** Same colour for the same person every time. */
export const colorFor = (id) => PALETTE[[...String(id || "")].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 997, 7) % PALETTE.length];
export const money = (value) => {
  const n = Number(value || 0);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(n >= 100000000 ? 0 : 1)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(n >= 1000000 ? 0 : 1)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
};
export const count = (value) => Number(value || 0).toLocaleString("en-IN");
export const pct = (part, whole) => (whole ? `${Math.round((part / whole) * 100)}%` : "–");
export const titleize = (value) => (value === "not-set" ? "Not set" : String(value || "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
export function ago(value) {
  if (!value) return "Never";
  const mins = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (mins < 60) return mins < 2 ? "Just now" : `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}
