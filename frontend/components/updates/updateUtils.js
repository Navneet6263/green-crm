// Helpers for the Recent Updates page. Dates are Indian calendar days (Asia/Kolkata).
import { API_BASE } from "../../lib/api";

const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 86400000;

export const istKey = (value) => new Date(new Date(value).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
export const todayKey = () => istKey(Date.now());
export const addDays = (key, days) => new Date(new Date(`${key}T00:00:00.000Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);
const monthStart = (key) => `${key.slice(0, 8)}01`;
const prevMonthEnd = (key) => addDays(monthStart(key), -1);

export const PRESETS = [
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["7d", "Last 7 days"],
  ["30d", "Last 30 days"],
  ["month", "This month"],
  ["lastMonth", "Last month"],
  ["custom", "Custom"],
];

export function presetRange(preset) {
  const today = todayKey();
  switch (preset) {
    case "today": return { from: today, to: today };
    case "yesterday": return { from: addDays(today, -1), to: addDays(today, -1) };
    case "30d": return { from: addDays(today, -29), to: today };
    case "month": return { from: monthStart(today), to: today };
    case "lastMonth": { const end = prevMonthEnd(today); return { from: monthStart(end), to: end }; }
    default: return { from: addDays(today, -6), to: today };
  }
}

export const fmtDay = (key, options = { day: "numeric", month: "short" }) =>
  new Date(`${key}T00:00:00.000Z`).toLocaleDateString("en-IN", { timeZone: "UTC", ...options });
export const fmtTime = (value) =>
  new Date(value).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true }).replace(" ", "").toLowerCase();
export const fmtDateTime = (value) => `${fmtDay(istKey(value))}, ${fmtTime(value)}`;
export function dayHeading(key) {
  const today = todayKey();
  if (key === today) return "Today";
  if (key === addDays(today, -1)) return "Yesterday";
  return fmtDay(key, { weekday: "long", day: "numeric", month: "long" });
}
export function ago(value) {
  const mins = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days < 31 ? `${days}d ago` : fmtDay(istKey(value));
}

export const initials = (name) => String(name || "?").split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
export const label = (value) => String(value || "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Same rules as the backend report (services/recentUpdates/noteParser.js).
const KEYS = ["Customer response", "Next follow-up", "Mode", "Calling status", "Email status", "Demo scheduled", "Requirement", "Notes", "Note"];
const SPLIT_BEFORE = new RegExp(`\\s+(?=(?:${KEYS.join("|")}):)`, "g");

export function parseNote(content) {
  const out = { kind: "note", statusFrom: "", statusTo: "", response: "", mode: "", callStatus: "", nextFollowUp: "", demoAt: "", requirement: "", assignedFrom: "", assignedTo: "", note: "" };
  let followUpLog = false;
  const rest = [];
  const text = String(content || "").replace(/\r/g, "").replace(SPLIT_BEFORE, "\n");
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    let m;
    if ((m = line.match(/^Status changed:\s*(.*?)\s*(?:->|→)\s*(.+)$/i)) || (m = line.match(/^Status changed from (.+?) to (.+)$/i))) {
      out.statusFrom = m[1].trim();
      out.statusTo = m[2].trim();
    } else if ((m = line.match(/^Status changed:\s*(.+)$/i))) out.statusTo = m[1].trim();
    else if (/^Follow-up Status$/i.test(line)) followUpLog = true;
    else if ((m = line.match(/^Customer response:\s*(.*)$/i))) out.response = m[1].trim();
    else if ((m = line.match(/^Mode:\s*(.*)$/i))) out.mode = m[1].trim();
    else if ((m = line.match(/^(?:Calling|Email) status:\s*(.*)$/i))) out.callStatus = m[1].trim();
    else if ((m = line.match(/^Next follow-up:\s*(.*)$/i))) {
      const withMode = m[1].trim().match(/^(.*?)\s*\(([^)]+)\)$/);
      out.nextFollowUp = withMode ? withMode[1] : m[1].trim();
      if (withMode && !out.mode) out.mode = withMode[2];
    } else if ((m = line.match(/^Demo scheduled:\s*(.*)$/i))) out.demoAt = m[1].trim();
    else if ((m = line.match(/^Requirement:\s*(.*)$/i))) out.requirement = m[1].trim();
    else if ((m = line.match(/^Assigned from (.+?) to (.+)$/i))) { out.assignedFrom = m[1].trim(); out.assignedTo = m[2].trim(); }
    else if ((m = line.match(/^(?:Notes?|Comment|Remarks?):\s*(.*)$/i))) { if (m[1].trim()) rest.push(m[1].trim()); }
    else rest.push(line);
  }
  out.note = rest.join("\n");
  if (out.demoAt) out.kind = "demo";
  else if (out.statusTo) out.kind = "status";
  else if (followUpLog || out.response || out.callStatus) out.kind = "followup";
  return out;
}

export const KINDS = {
  status: { label: "Status change", plural: "Status changes", dot: "bg-brand-600", chip: "bg-brand-50 text-brand-800 ring-brand-100", bar: "bg-brand-600" },
  followup: { label: "Follow-up call", plural: "Follow-up calls", dot: "bg-sky-500", chip: "bg-sky-50 text-sky-800 ring-sky-100", bar: "bg-sky-500" },
  demo: { label: "Demo booked", plural: "Demos booked", dot: "bg-violet-500", chip: "bg-violet-50 text-violet-800 ring-violet-100", bar: "bg-violet-500" },
  note: { label: "Note", plural: "Notes", dot: "bg-gold-500", chip: "bg-gold-50 text-gold-800 ring-gold-200", bar: "bg-gold-500" },
};

/** Adds parsed fields and the Indian day to each note. */
export const prepare = (rows) => rows.map((row) => ({ ...row, parsed: parseNote(row.content), day: istKey(row.created_at), recordKey: `${row.note_type}:${row.entity_id || row.customer_id}` }));

/** Totals for the cards and side lists. */
export function summarise(notes) {
  const people = new Map();
  const teams = new Map();
  const statuses = new Map();
  const records = new Set();
  const t = { updates: notes.length, status: 0, followups: 0, demos: 0, nextBooked: 0, responses: 0, lead: 0, customer: 0 };
  for (const n of notes) {
    const p = n.parsed;
    records.add(n.recordKey);
    t[n.note_type === "lead" ? "lead" : "customer"] += 1;
    if (p.kind === "status") t.status += 1;
    if (p.kind === "followup") t.followups += 1;
    if (p.kind === "demo") t.demos += 1;
    if (p.nextFollowUp) t.nextBooked += 1;
    if (p.response) t.responses += 1;
    if (p.statusTo) statuses.set(p.statusTo, (statuses.get(p.statusTo) || 0) + 1);

    const id = n.created_by || "unknown";
    if (!people.has(id)) people.set(id, { id, name: n.created_by_name || "Unknown user", role: n.created_by_role || "", teams: new Set(), updates: 0, status: 0, followups: 0, demos: 0, nextBooked: 0, records: new Set(), days: new Map(), hours: new Array(24).fill(0), last: null });
    const person = people.get(id);
    person.updates += 1;
    if (p.kind === "status") person.status += 1;
    if (p.kind === "followup") person.followups += 1;
    if (p.kind === "demo") person.demos += 1;
    if (p.nextFollowUp) person.nextBooked += 1;
    person.records.add(n.recordKey);
    person.days.set(n.day, (person.days.get(n.day) || 0) + 1);
    person.hours[new Date(new Date(n.created_at).getTime() + IST_OFFSET_MS).getUTCHours()] += 1;
    if (n.team_name) person.teams.add(n.team_name);
    if (!person.last || new Date(n.created_at) > new Date(person.last)) person.last = n.created_at;

    const teamName = n.team_name || "No team";
    if (!teams.has(teamName)) teams.set(teamName, { name: teamName, updates: 0, people: new Set(), records: new Set(), status: 0, demos: 0 });
    const team = teams.get(teamName);
    team.updates += 1;
    team.people.add(id);
    team.records.add(n.recordKey);
    if (p.kind === "status") team.status += 1;
    if (p.kind === "demo") team.demos += 1;
  }
  const byUpdates = (a, b) => b.updates - a.updates || a.name.localeCompare(b.name);
  return {
    totals: { ...t, records: records.size, people: people.size },
    people: [...people.values()].sort(byUpdates),
    teams: [...teams.values()].sort(byUpdates),
    statuses: [...statuses.entries()].sort((a, b) => b[1] - a[1]),
  };
}

export async function downloadReport(query, token) {
  const response = await fetch(`${API_BASE}/recent-activity/report?${query}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || body.message || "The report could not be created.");
  }
  const blob = await response.blob();
  const name = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") || "")?.[1] || "GreenCRM-updates.xlsx";
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
