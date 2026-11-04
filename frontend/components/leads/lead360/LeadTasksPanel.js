"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../../../lib/api";
import TaskComposer from "../../calendar/TaskComposer";
import { leadPrimaryName } from "../shared/leadPageFormatters";
import { formatClock, formatDay, istDayKey } from "../workspace/leadWorkspaceConfig";

const DONE = ["done", "completed", "cancelled"];

/** Tasks linked to this lead, with add and complete. They also appear on the calendar. */
export default function LeadTasksPanel({ lead, token, people = [], selfId, canEdit, seed = 0 }) {
  const [tasks, setTasks] = useState(null);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const leadId = lead.lead_id;

  useEffect(() => {
    if (!token || !leadId) return undefined;
    let cancelled = false;
    setError("");
    apiRequest(`/tasks?related_to=lead&related_id=${encodeURIComponent(leadId)}&page_size=50`, { token, fresh: true })
      .then((res) => { if (!cancelled) setTasks(res?.items || res?.data || []); })
      .catch((err) => { if (!cancelled) { setTasks([]); setError(err.message || "Tasks could not be loaded."); } });
    return () => { cancelled = true; };
  }, [token, leadId, refresh, seed]);

  const toggle = useCallback(async (task) => {
    const done = DONE.includes(String(task.status).toLowerCase());
    setTasks((list) => list.map((t) => (t.task_id === task.task_id ? { ...t, status: done ? "pending" : "done" } : t)));
    try {
      await apiRequest(`/tasks/${encodeURIComponent(task.task_id)}`, { method: "PATCH", token, body: { status: done ? "pending" : "done" } });
    } catch (err) {
      setError(err.message || "The task could not be changed.");
      setRefresh((r) => r + 1);
    }
  }, [token]);

  const today = istDayKey(Date.now());
  const open = (tasks || []).filter((t) => !DONE.includes(String(t.status).toLowerCase()));
  const closed = (tasks || []).filter((t) => DONE.includes(String(t.status).toLowerCase()));
  const assignees = people.length && selfId && !people.some((p) => p.user_id === selfId) ? [{ user_id: selfId, name: "Me" }, ...people] : people;

  const row = (task) => {
    const done = DONE.includes(String(task.status).toLowerCase());
    const late = !done && istDayKey(task.due_date) < today;
    return (
      <li key={task.task_id} className="flex items-start gap-2.5 rounded-[10px] bg-white px-3 py-2 ring-1 ring-slate-200">
        <button type="button" disabled={!canEdit} onClick={() => toggle(task)} aria-pressed={done} aria-label={done ? `Reopen ${task.title}` : `Mark ${task.title} done`}
          className={`mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full ring-1 ${done ? "bg-brand-700 text-white ring-brand-700" : "bg-white ring-slate-300 hover:ring-brand-500"}`}>
          {done ? <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m5 12 5 5L20 7" /></svg> : null}
        </button>
        <div className="min-w-0 flex-1">
          <p className={`text-[13px] font-medium ${done ? "text-slate-400 line-through" : "text-slate-900"}`}>{task.title}</p>
          <p className={`text-[11.5px] ${late ? "font-semibold text-rose-700" : "text-slate-500"}`}>
            {formatDay(task.due_date)}, {formatClock(task.due_date)}{late ? " · Overdue" : ""}{task.assigned_to_name ? ` · ${task.assigned_to_name}` : ""}
          </p>
        </div>
      </li>
    );
  };

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className="text-[12.5px] text-slate-500">{tasks === null ? "Loading…" : `${open.length} open · ${closed.length} done`}</p>
        {canEdit ? (
          <button type="button" onClick={() => setDraft({ date: today, time: "10:00", record: { kind: "lead", id: leadId, name: lead.company_name || leadPrimaryName(lead), phone: lead.phone || "" } })}
            className="rounded-[8px] bg-white px-2.5 py-1 text-[12.5px] font-semibold text-brand-800 ring-1 ring-slate-200 hover:bg-brand-50">+ Add task</button>
        ) : null}
      </div>
      {error ? <p role="alert" className="mb-2 rounded-[10px] bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{error}</p> : null}
      {tasks && !tasks.length ? <p className="rounded-[10px] border border-dashed border-slate-200 px-4 py-5 text-center text-[13px] text-slate-500">No tasks for this lead yet.</p> : null}
      {open.length ? <ul className="space-y-1.5">{open.map(row)}</ul> : null}
      {closed.length ? (
        <details className="mt-2.5">
          <summary className="cursor-pointer text-[12.5px] font-semibold text-slate-500">{closed.length} done</summary>
          <ul className="mt-1.5 space-y-1.5">{closed.map(row)}</ul>
        </details>
      ) : null}
      <TaskComposer draft={draft} onClose={() => setDraft(null)} onSaved={(_form, again) => { if (!again) setDraft(null); setRefresh((r) => r + 1); }} token={token} people={assignees} selfId={selfId} />
    </div>
  );
}
