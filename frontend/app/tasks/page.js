"use client";

import { useMemo, useState } from "react";
import WorkspacePage from "../../components/dashboard/WorkspacePage";
import DashboardIcon from "../../components/dashboard/icons";
import { apiRequest } from "../../lib/api";
import { formatIndiaCustom } from "../../lib/dateTime";
import { AlertError, AlertSuccess } from "../../components/ui/Alert";
import { TaskCard } from "./TaskCard";
import { TaskFilters } from "./TaskFilters";
import { TaskTimeline } from "./TaskTimeline";
import { T, nice } from "./task-tokens";

function when(v) {
  return formatIndiaCustom(v, { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" });
}

function isOverdue(t) {
  return t.status === "pending" && t.due_date && new Date(t.due_date) < new Date();
}

export default function TasksPage() {
  return (
    <WorkspacePage
      title="Tasks" eyebrow="Execution Queue" hideTitle
      allowedRoles={["super-admin","platform-admin","platform-manager","admin","manager","sales","marketing","legal-team","finance-team","support"]}
      requestBuilder={() => [{ key:"tasks", path:"/tasks?page_size=60" }]}
      heroStats={() => []}
    >
      {({ data, error, loading, session, refresh }) => {
        const tasks = data.tasks?.items || [];
        return <TasksContent tasks={tasks} loadError={error} loading={loading} session={session} refresh={refresh} />;
      }}
    </WorkspacePage>
  );
}

function TasksContent({ tasks, loadError, loading, session, refresh }) {
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupBy, setGroupBy] = useState("status");
  const [view, setView] = useState("board"); // board | timeline

  async function toggleTaskStatus(task) {
    if (!session?.token || !task?.task_id) return;
    const next = task.status === "done" ? "pending" : "done";
    setUpdatingId(task.task_id); setActionError(""); setActionNotice("");
    try {
      await apiRequest(`/tasks/${task.task_id}`, { method:"PATCH", token:session.token, body:{ status:next } });
      setActionNotice(`Task marked as ${next}.`);
      if (refresh) await refresh();
    } catch(e) { setActionError(e.message || "Could not update task."); }
    finally { setUpdatingId(""); }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter(t => {
      const hay = [t.title, t.notes, t.assigned_to_name, t.type, t.priority, t.status, t.team_name].filter(Boolean).join(" ").toLowerCase();
      return (!q || hay.includes(q))
        && (typeFilter === "all" || t.type === typeFilter)
        && (priorityFilter === "all" || t.priority === priorityFilter)
        && (statusFilter === "all" || t.status === statusFilter);
    });
  }, [tasks, search, typeFilter, priorityFilter, statusFilter]);

  const stats = useMemo(() => ({
    pending: tasks.filter(t => t.status === "pending").length,
    overdue: tasks.filter(isOverdue).length,
    done:    tasks.filter(t => t.status === "done").length,
    total:   tasks.length,
  }), [tasks]);

  const groups = useMemo(() => {
    if (groupBy === "type") {
      const m = {};
      filtered.forEach(t => { const k = t.type||"task"; (m[k]=m[k]||[]).push(t); });
      return Object.entries(m).sort((a,b)=>b[1].length-a[1].length).map(([k,v])=>({ key:k, label:nice(k), tasks:v }));
    }
    if (groupBy === "team") {
      const m = {};
      filtered.forEach(t => { const k = t.team_name||"No team"; (m[k]=m[k]||[]).push(t); });
      return Object.entries(m).sort((a,b)=>b[1].length-a[1].length).map(([k,v])=>({ key:k, label:k, tasks:v }));
    }
    const order = ["pending","in-progress","done","cancelled"];
    const m = {};
    filtered.forEach(t => { const k = t.status||"pending"; (m[k]=m[k]||[]).push(t); });
    return order.filter(k=>m[k]).map(k=>({ key:k, label:nice(k), tasks:m[k] }));
  }, [filtered, groupBy]);

  return (
    <>
      {loadError ? <AlertError message={loadError} /> : null}
      <AlertError message={actionError} onDismiss={() => setActionError("")} />
      <AlertSuccess message={actionNotice} onDismiss={() => setActionNotice("")} />

      {loading ? <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 text-sm text-slate-500">Loading tasks…</div> : null}

      {!loading ? (
        <div className="space-y-5">
          <TaskFilters
            stats={stats} typeFilter={typeFilter} priorityFilter={priorityFilter}
            statusFilter={statusFilter} search={search}
            onType={setTypeFilter} onPriority={setPriorityFilter}
            onStatus={setStatusFilter} onSearch={setSearch}
          />

          {/* View toggle + group by */}
          <div className="flex flex-wrap items-center gap-3">
            {/* View switcher */}
            <div className="flex rounded-xl border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setView("board")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${view === "board" ? "bg-amber-50 text-amber-900 border border-amber-200" : "text-slate-500 hover:text-slate-800"}`}
              >
                <DashboardIcon name="dashboard" className="h-3.5 w-3.5" />Board
              </button>
              <button
                type="button"
                onClick={() => setView("timeline")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${view === "timeline" ? "bg-amber-50 text-amber-900 border border-amber-200" : "text-slate-500 hover:text-slate-800"}`}
              >
                <DashboardIcon name="calendar" className="h-3.5 w-3.5" />Timeline
              </button>
            </div>

            {/* Group by — only in board view */}
            {view === "board" ? (
              <>
                <span className={T.kicker}>Group</span>
                {[["status","Status"],["type","Type"],["team","Team"]].map(([v,l]) => (
                  <button
                    key={v} type="button" onClick={() => setGroupBy(v)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${groupBy === v ? "border-amber-300 bg-amber-50 text-amber-900" : "border-slate-200 bg-white text-slate-600 hover:border-amber-200"}`}
                  >{l}</button>
                ))}
              </>
            ) : null}

            <span className="ml-auto text-xs text-slate-400">{filtered.length} of {tasks.length} tasks</span>
          </div>

          {/* Board view */}
          {view === "board" ? (
            groups.length ? (
              <div className="space-y-6">
                {groups.map(group => (
                  <div key={group.key}>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-700">{group.label}</span>
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{group.tasks.length}</span>
                      <div className="h-px flex-1 bg-slate-100" />
                    </div>
                    <div className="space-y-2.5">
                      {group.tasks.map(task => (
                        <TaskCard key={task.task_id} task={task} updatingId={updatingId} onToggle={toggleTaskStatus} when={when} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white text-center">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                  <DashboardIcon name="tasks" className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-slate-700">No tasks matched</p>
                <p className="text-xs text-slate-400">Adjust filters or create a task from a lead.</p>
              </div>
            )
          ) : null}

          {/* Timeline view */}
          {view === "timeline" ? (
            <TaskTimeline tasks={filtered} updatingId={updatingId} onToggle={toggleTaskStatus} />
          ) : null}
        </div>
      ) : null}
    </>
  );
}
