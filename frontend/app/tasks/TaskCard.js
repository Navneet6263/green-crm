"use client";

import Link from "next/link";
import { T, nice, typeCfg, PRIORITY_CFG, STATUS_CFG } from "./task-tokens";
import { teamBadgeLabel } from "../../lib/teamScope";

function isOverdue(task) {
  return task.status === "pending" && task.due_date && new Date(task.due_date) < new Date();
}

export function TaskCard({ task, updatingId, onToggle, when }) {
  const cfg = typeCfg(task.type);
  const overdue = isOverdue(task);
  const pCls = PRIORITY_CFG[task.priority?.toLowerCase()] || PRIORITY_CFG.medium;
  const sCls = STATUS_CFG[task.status?.toLowerCase()] || STATUS_CFG.pending;
  const teamLabel = teamBadgeLabel(task);

  return (
    <article className={`group relative overflow-hidden rounded-2xl border bg-white transition hover:-translate-y-0.5 hover:shadow-md ${
      overdue ? "border-rose-200 shadow-sm" : task.status === "done" ? "border-slate-100 opacity-75" : "border-slate-100 shadow-sm"
    }`}>
      {/* shimmer */}
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-500 group-hover:translate-x-full" />

      <div className="relative px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {/* Left — type icon + title */}
          <div className="flex min-w-0 items-start gap-3">
            {/* Type badge */}
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border text-lg ${cfg.bg} ${cfg.border}`}>
              {cfg.icon}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${cfg.border} ${cfg.bg} ${cfg.text}`}>
                  {nice(task.type || "task")}
                </span>
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sCls}`}>
                  {nice(task.status || "pending")}
                </span>
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${pCls}`}>
                  {nice(task.priority || "medium")}
                </span>
                {teamLabel ? (
                  <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                    {teamLabel}
                  </span>
                ) : null}
                {overdue ? (
                  <span className="inline-flex rounded-full border border-rose-300 bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                    Overdue
                  </span>
                ) : null}
              </div>
              <h4 className="mt-1 text-sm font-bold text-slate-900">{task.title || "Untitled task"}</h4>
              {task.notes ? <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{task.notes}</p> : null}
            </div>
          </div>

          {/* Right — action */}
          <button
            type="button"
            disabled={updatingId === task.task_id}
            onClick={() => onToggle(task)}
            className={task.status === "done" ? T.ghost : T.gold}
          >
            {updatingId === task.task_id ? "Updating…" : task.status === "done" ? "Reopen" : "Mark Done"}
          </button>
        </div>

        {/* Meta row */}
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-50 pt-3 text-xs text-slate-400">
          {task.due_date ? (
            <span className={overdue ? "font-semibold text-rose-600" : ""}>
              Due: <strong className={overdue ? "text-rose-700" : "text-slate-600"}>{when(task.due_date)}</strong>
            </span>
          ) : null}
          <span>Assignee: <strong className="text-slate-600">{task.assigned_to_name || "Unassigned"}</strong></span>
          {task.related_to === "lead" && task.related_id ? (
            <Link
              href={`/leads/${task.related_id}`}
              className="inline-flex items-center gap-1 font-semibold text-amber-700 hover:underline"
            >
              🔗 View Lead
            </Link>
          ) : null}
          {task.related_to === "customer" && task.related_id ? (
            <Link
              href={`/customers/${task.related_id}`}
              className="inline-flex items-center gap-1 font-semibold text-sky-700 hover:underline"
            >
              🔗 View Customer
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
