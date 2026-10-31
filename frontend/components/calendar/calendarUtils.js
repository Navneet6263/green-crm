// Calendar helpers. All dates are handled as Indian calendar days (Asia/Kolkata).
const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 86400000;

export const istParts = (value) => {
  const shifted = new Date(new Date(value).getTime() + IST_OFFSET_MS);
  return { key: shifted.toISOString().slice(0, 10), hour: shifted.getUTCHours(), minute: shifted.getUTCMinutes() };
};
export const todayKey = () => istParts(Date.now()).key;
export const keyToDate = (key) => new Date(`${key}T00:00:00.000Z`);
export const addDays = (key, days) => new Date(keyToDate(key).getTime() + days * DAY_MS).toISOString().slice(0, 10);
export const weekday = (key) => (keyToDate(key).getUTCDay() + 6) % 7; // Monday = 0
export const startOfWeek = (key) => addDays(key, -weekday(key));
export const startOfMonth = (key) => `${key.slice(0, 8)}01`;
export const addMonths = (key, months) => {
  const d = keyToDate(startOfMonth(key));
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
};
// Start of an IST calendar day as a real instant, for API ranges.
export const istInstant = (key) => new Date(keyToDate(key).getTime() - IST_OFFSET_MS).toISOString();

export const fmt = (key, options) => keyToDate(key).toLocaleDateString("en-IN", { timeZone: "UTC", ...options });
export const formatTime = (value) =>
  new Date(value).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true }).replace(" ", "").toLowerCase();

/** Visible range for a view, as IST day keys [from, to). */
export function viewRange(view, anchor) {
  if (view === "month") {
    const from = startOfWeek(startOfMonth(anchor));
    return { from, to: addDays(from, 42) };
  }
  if (view === "week") {
    const from = startOfWeek(anchor);
    return { from, to: addDays(from, 7) };
  }
  return { from: anchor, to: addDays(anchor, 14) };
}

export function rangeTitle(view, anchor) {
  if (view === "month") return fmt(anchor, { month: "long", year: "numeric" });
  const { from, to } = viewRange(view, anchor);
  const last = addDays(to, -1);
  const sameMonth = from.slice(0, 7) === last.slice(0, 7);
  return `${fmt(from, { day: "numeric", ...(sameMonth ? {} : { month: "short" }) })} – ${fmt(last, { day: "numeric", month: "short", year: "numeric" })}`;
}

// What each kind of item looks like. Gold is kept for lead follow-ups, the CRM's main daily work.
export const CATEGORIES = [
  { key: "followup", label: "Lead follow-ups", dot: "bg-gold-500", chip: "bg-gold-50 text-gold-800 border-gold-200", bar: "bg-gold-500" },
  { key: "call", label: "Calls", dot: "bg-brand-600", chip: "bg-brand-50 text-brand-800 border-brand-100", bar: "bg-brand-600" },
  { key: "meeting", label: "Meetings & demos", dot: "bg-sky-500", chip: "bg-sky-50 text-sky-800 border-sky-100", bar: "bg-sky-500" },
  { key: "message", label: "WhatsApp & email", dot: "bg-violet-500", chip: "bg-violet-50 text-violet-800 border-violet-100", bar: "bg-violet-500" },
  { key: "task", label: "Other tasks", dot: "bg-slate-400", chip: "bg-slate-50 text-slate-700 border-slate-200", bar: "bg-slate-400" },
];
export const categoryOf = (key) => CATEGORIES.find((c) => c.key === key) || CATEGORIES[4];
export const OVERDUE_STYLE = { dot: "bg-rose-500", chip: "bg-rose-50 text-rose-700 border-rose-200", bar: "bg-rose-500" };

const taskCategory = (type) => {
  const t = String(type || "").toLowerCase();
  if (t === "call") return "call";
  if (t === "meeting" || t === "demo") return "meeting";
  if (t === "whatsapp" || t === "email") return "message";
  return "task";
};
const DONE = ["done", "completed", "cancelled"];
const label = (value) => String(value || "").replace(/[-_]/g, " ");

export function fromTask(task, now = Date.now()) {
  const at = task.due_date;
  const status = String(task.status || "pending").toLowerCase();
  const done = DONE.includes(status);
  const parts = istParts(at);
  return {
    key: `t-${task.task_id}`,
    kind: "task",
    category: taskCategory(task.type),
    title: task.title,
    subtitle: [label(task.type), task.assigned_to_name].filter(Boolean).join(" · "),
    at,
    dayKey: parts.key,
    minutes: parts.hour * 60 + parts.minute,
    timed: parts.hour !== 0 || parts.minute !== 0,
    done,
    overdue: !done && new Date(at).getTime() < now,
    status: label(status),
    priority: label(task.priority),
    owner: task.assigned_to_name || "",
    notes: task.notes || "",
    href: task.related_to === "lead" && task.related_id ? `/leads/${encodeURIComponent(task.related_id)}`
      : task.related_to === "customer" && task.related_id ? `/customers/${encodeURIComponent(task.related_id)}` : null,
    hrefLabel: task.related_to === "lead" ? "Open lead" : "Open customer",
    raw: task,
  };
}

export function fromFollowUp(row, now = Date.now()) {
  const parts = istParts(row.due_at);
  const status = String(row.status || "").toLowerCase();
  const closed = ["closed-won", "closed-lost", "won", "lost", "completed"].includes(status);
  return {
    key: `f-${row.lead_id}`,
    kind: "followup",
    category: "followup",
    title: row.company_name || row.contact_person_name || "Lead follow-up",
    subtitle: ["Follow-up", row.contact_person_name].filter(Boolean).join(" · "),
    at: row.due_at,
    dayKey: parts.key,
    minutes: parts.hour * 60 + parts.minute,
    timed: parts.hour !== 0 || parts.minute !== 0,
    done: closed,
    overdue: !closed && new Date(row.due_at).getTime() < now,
    status: label(status || "open"),
    priority: "",
    owner: "",
    assignedTo: row.assigned_to || "",
    notes: "",
    href: `/leads/${encodeURIComponent(row.lead_id)}`,
    hrefLabel: "Open lead",
  };
}

export const byTime = (a, b) => new Date(a.at) - new Date(b.at) || a.title.localeCompare(b.title);

export function styleOf(item) {
  return item.overdue ? OVERDUE_STYLE : categoryOf(item.category);
}
