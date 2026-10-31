"use client";

import { useState } from "react";
import ReportDrawer from "../reports/ReportDrawer";
import { useReportLayout } from "../reports/useReportLayout";
import { API_BASE } from "../../lib/api";
import { addDays, addMonths, fmt, startOfMonth, startOfWeek, todayKey } from "./calendarUtils";

const TASK_PRESETS = [
  { key: "full", label: "Everything", description: "Summary, tasks, people and follow-ups", layout: { sheets: ["summary", "tasks", "people", "followups"] } },
  {
    key: "todo", label: "My to-do list", description: "Day-wise list to print or share",
    layout: { sheets: ["tasks"], columns: { tasks: ["date", "time", "title", "type", "priority", "state", "company", "phone", "notes"] }, options: { tasks: { group: "day" } } },
  },
  {
    key: "team", label: "Team review", description: "Per person: open, done, overdue",
    layout: { sheets: ["summary", "people", "tasks"], columns: { tasks: ["date", "time", "title", "type", "state", "assignee", "company", "daysLate"] }, options: { tasks: { group: "person" } } },
  },
  { key: "followups", label: "Lead follow-ups", description: "Only follow-up dates set on leads", layout: { sheets: ["followups"] } },
];

const STATUSES = [["all", "All"], ["open", "Open"], ["overdue", "Overdue"], ["done", "Done"]];
const TYPES = [["", "All types"], ["call", "Calls"], ["meeting", "Meetings"], ["demo", "Demos"], ["whatsapp", "WhatsApp"], ["email", "Email"], ["task", "To-dos"], ["reminder", "Reminders"]];
const CHIP = (on) => `rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition ${on ? "bg-brand-700 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`;
const INPUT = "h-9 rounded-[10px] border border-slate-200 bg-white px-2.5 text-[13px] text-slate-800 outline-none focus:border-brand-400";

function rangeFor(key, viewRange, custom) {
  const today = todayKey();
  switch (key) {
    case "view": return { from: viewRange.from, to: addDays(viewRange.to, -1) };
    case "today": return { from: today, to: today };
    case "week": { const from = startOfWeek(today); return { from, to: addDays(from, 6) }; }
    case "month": { const from = startOfMonth(today); return { from, to: addDays(addMonths(from, 1), -1) }; }
    case "custom": return custom;
    default: return { from: "", to: "" };
  }
}

/**
 * Downloads tasks and lead follow-ups as Excel. Uses the calendar's current "whose work" choice;
 * the server limits what each role can see.
 */
export default function TaskDownload({ open, onClose, token, scopeQuery, scopeLabel, viewRange, viewTitle }) {
  const report = useReportLayout({ token, catalogPath: "/tasks/export/columns", storageKey: "greencrm:tasks-report", presets: TASK_PRESETS });
  const [period, setPeriod] = useState("view");
  const [custom, setCustom] = useState(() => ({ from: todayKey(), to: addDays(todayKey(), 6) }));
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const range = rangeFor(period, viewRange, custom);
  const periods = [["view", `This view (${viewTitle})`], ["today", "Today"], ["week", "This week"], ["month", "This month"], ["custom", "Pick dates"], ["all", "All dates"]];

  async function download() {
    if (range.from && range.to && range.from > range.to) { setError("The from date is after the to date."); return; }
    setDownloading(true);
    setError("");
    try {
      const params = new URLSearchParams(scopeQuery.replace(/^&/, ""));
      if (range.from) params.set("from", range.from);
      if (range.to) params.set("to", range.to);
      if (status !== "all") params.set("status", status);
      if (type) params.set("type", type);
      const response = await fetch(`${API_BASE}/tasks/export?${params}&${report.query}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || body.message || "The file could not be created.");
      }
      const blob = await response.blob();
      const name = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") || "")?.[1] || "GreenCRM-tasks.xlsx";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  }

  const rangeText = range.from ? `${fmt(range.from, { day: "numeric", month: "short" })}${range.to !== range.from ? ` – ${fmt(range.to, { day: "numeric", month: "short", year: "numeric" })}` : ""}` : "All dates";

  return (
    <ReportDrawer open={open} onClose={onClose} title="Download tasks" subtitle={`${scopeLabel} · ${rangeText}`} report={report} onDownload={download} downloading={downloading} error={error}>
      <section className="space-y-3 rounded-[14px] bg-white p-4 ring-1 ring-slate-200">
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Dates</p>
          <div className="flex flex-wrap gap-1.5">
            {periods.map(([key, text]) => <button key={key} type="button" onClick={() => setPeriod(key)} className={CHIP(period === key)}>{text}</button>)}
          </div>
          {period === "custom" ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input type="date" value={custom.from} onChange={(e) => e.target.value && setCustom((c) => ({ ...c, from: e.target.value }))} className={INPUT} aria-label="From date" />
              <span className="text-[12px] text-slate-400">to</span>
              <input type="date" value={custom.to} onChange={(e) => e.target.value && setCustom((c) => ({ ...c, to: e.target.value }))} className={INPUT} aria-label="To date" />
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</p>
            <div className="flex rounded-[10px] bg-slate-100 p-0.5">
              {STATUSES.map(([key, text]) => (
                <button key={key} type="button" onClick={() => setStatus(key)}
                  className={`rounded-[8px] px-3 py-1.5 text-[12.5px] font-semibold ${status === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{text}</button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Type</span>
            <select value={type} onChange={(e) => setType(e.target.value)} className={INPUT}>
              {TYPES.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
            </select>
          </label>
        </div>
        <p className="text-[12px] text-slate-500">Whose tasks: <b className="text-slate-800">{scopeLabel}</b> — change it with “Whose work” on the calendar.</p>
      </section>
    </ReportDrawer>
  );
}
