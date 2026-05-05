"use client";

import { useMemo } from "react";
import { formatIndiaDate, formatIndiaCustom } from "../../lib/dateTime";
import { T, nice, typeCfg, PRIORITY_CFG, STATUS_CFG } from "./task-tokens";
import { teamBadgeLabel } from "../../lib/teamScope";
import Link from "next/link";

function when(v) {
  return formatIndiaCustom(v, { hour:"2-digit", minute:"2-digit" });
}

function dateKey(v) {
  if (!v) return "No Date";
  const d = formatIndiaDate(v);
  return d && d !== "--" ? d : "No Date";
}

function isToday(key) {
  return key === formatIndiaDate(new Date().toISOString());
}

function isTomorrow(key) {
  const t = new Date(); t.setDate(t.getDate() + 1);
  return key === formatIndiaDate(t.toISOString());
}

function isPast(key) {
  if (key === "No Date") return false;
  const parts = key.split(" ");
  try { return new Date(key) < new Date(new Date().toDateString()); } catch { return false; }
}

function dayLabel(key) {
  if (key === "No Date") return { label:"No Date", accent:"border-slate-200 bg-slate-100 text-slate-500" };
  if (isToday(key))    return { label:`Today · ${key}`,    accent:"border-amber-300 bg-amber-100 text-amber-900" };
  if (isTomorrow(key)) return { label:`Tomorrow · ${key}`, accent:"border-sky-200 bg-sky-100 text-sky-700" };
  if (isPast(key))     return { label:key,                 accent:"border-rose-200 bg-rose-100 text-rose-700" };
  return { label:key, accent:"border-emerald-200 bg-emerald-100 text-emerald-700" };
}

function TimelineTaskRow({ task, updatingId, onToggle }) {
  const cfg = typeCfg(task.type);
  const pCls = PRIORITY_CFG[task.priority?.toLowerCase()] || PRIORITY_CFG.medium;
  const sCls = STATUS_CFG[task.status?.toLowerCase()] || STATUS_CFG.pending;
  const teamLabel = teamBadgeLabel(task);

  return (
    <div className="flex gap-3">
      {/* Time column */}
      <div className="w-16 shrink-0 pt-1 text-right">
        <span className="text-xs font-semibold text-slate-400">{task.due_date ? when(task.due_date) : "—"}</span>
      </div>
      {/* Dot + line */}
      <div className="flex flex-col items-center">
        <div className={`mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 border-white ring-2 ${task.status === "done" ? "bg-emerald-400 ring-emerald-200" : "bg-amber-400 ring-amber-200"}`} />
        <div className="mt-1 w-px flex-1 bg-slate-100" />
      </div>
      {/* Card */}
      <div className={`mb-3 flex-1 rounded-2xl border bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${task.status === "done" ? "border-slate-100 opacity-70" : "border-slate-100"}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-base">{cfg.icon}</span>
              <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${cfg.border} ${cfg.bg} ${cfg.text}`}>{nice(task.type||"task")}</span>
              <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${pCls}`}>{nice(task.priority||"medium")}</span>
              <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sCls}`}>{nice(task.status||"pending")}</span>
              {teamLabel ? <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">{teamLabel}</span> : null}
            </div>
            <p className="mt-1 text-sm font-bold text-slate-900">{task.title || "Untitled task"}</p>
            {task.notes ? <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{task.notes}</p> : null}
            <div className="mt-1.5 flex flex-wrap gap-x-4 text-xs text-slate-400">
              <span>Assignee: <strong className="text-slate-600">{task.assigned_to_name||"Unassigned"}</strong></span>
              {task.related_to === "lead" && task.related_id ? (
                <Link href={`/leads/${task.related_id}`} className="font-semibold text-amber-700 hover:underline">🔗 Lead</Link>
              ) : null}
              {task.related_to === "customer" && task.related_id ? (
                <Link href={`/customers/${task.related_id}`} className="font-semibold text-sky-700 hover:underline">🔗 Customer</Link>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            disabled={updatingId === task.task_id}
            onClick={() => onToggle(task)}
            className={task.status === "done" ? T.ghost : T.gold}
          >
            {updatingId === task.task_id ? "…" : task.status === "done" ? "Reopen" : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TaskTimeline({ tasks, updatingId, onToggle }) {
  const grouped = useMemo(() => {
    const sorted = [...tasks].sort((a,b) => new Date(a.due_date||0) - new Date(b.due_date||0));
    const m = {};
    sorted.forEach(t => { const k = dateKey(t.due_date); (m[k] = m[k]||[]).push(t); });
    // Sort: past first, then today, then future, then no-date last
    return Object.entries(m).sort(([a],[b]) => {
      if (a === "No Date") return 1;
      if (b === "No Date") return -1;
      return new Date(a) - new Date(b);
    });
  }, [tasks]);

  if (!grouped.length) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-center">
        <p className="text-sm text-slate-400">No tasks to show on timeline.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(([key, items]) => {
        const { label, accent } = dayLabel(key);
        return (
          <div key={key}>
            {/* Day header */}
            <div className="mb-3 flex items-center gap-3">
              <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold ${accent}`}>{label}</span>
              <span className="text-xs text-slate-400">{items.length} task{items.length !== 1 ? "s" : ""}</span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>
            {/* Timeline rows */}
            <div>
              {items.map(task => (
                <TimelineTaskRow key={task.task_id} task={task} updatingId={updatingId} onToggle={onToggle} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
