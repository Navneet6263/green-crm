"use client";

import { useMemo, useState, useEffect } from "react";
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

  // User list for task assignment
  const [users, setUsers] = useState([]);

  // Quick task creation modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formType, setFormType] = useState("call");
  const [formPriority, setFormPriority] = useState("medium");
  const [formAssignee, setFormAssignee] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load CRM users on mount for assignee selector
  useEffect(() => {
    if (!session?.token) return;
    apiRequest("/chat/users", { token: session.token })
      .then(r => {
        const list = Array.isArray(r) ? r : r?.data || [];
        setUsers(list);
      })
      .catch(e => console.error("Failed to load users for assignment:", e));
  }, [session]);

  // Set default assignee to current logged-in user when modal opens
  useEffect(() => {
    if (session?.user?.id && isCreateOpen) {
      setFormAssignee(String(session.user.id));
    }
  }, [session, isCreateOpen]);

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

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDueDate) return;
    setIsSubmitting(true);
    setActionError("");
    setActionNotice("");
    try {
      await apiRequest("/tasks", {
        method: "POST",
        token: session.token,
        body: {
          title: formTitle.trim(),
          due_date: new Date(formDueDate).toISOString(),
          type: formType,
          priority: formPriority,
          assigned_to: Number(formAssignee) || Number(session?.user?.id),
          notes: formNotes.trim() || null
        }
      });
      setActionNotice("Task created successfully!");
      setIsCreateOpen(false);
      // Reset form
      setFormTitle("");
      setFormDueDate("");
      setFormType("call");
      setFormPriority("medium");
      setFormNotes("");
      if (refresh) await refresh();
    } catch (err) {
      setActionError(err.message || "Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

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
            onCreateTrigger={() => setIsCreateOpen(true)}
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
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-start">
                {groups.map(group => (
                  <div key={group.key} className="flex flex-col rounded-2xl border border-slate-200/60 bg-slate-50/50 p-4 min-h-[450px]">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-850">{group.label}</span>
                        <span className="rounded-full bg-slate-200/60 px-2 py-0.5 text-xs font-bold text-slate-600">
                          {group.tasks.length}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          if (groupBy === "type") setFormType(group.key);
                          setIsCreateOpen(true);
                        }}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                      </button>
                    </div>

                    <div className="flex flex-1 flex-col gap-3">
                      {group.tasks.length > 0 ? (
                        group.tasks.map(task => (
                          <TaskCard key={task.task_id} task={task} updatingId={updatingId} onToggle={toggleTaskStatus} when={when} />
                        ))
                      ) : (
                        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
                          <p className="text-xs text-slate-400 font-medium">No tasks found</p>
                        </div>
                      )}
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

      {/* Quick Task Creation Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
              <h3 className="text-base font-bold text-slate-800">Create New Task</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Task Title *</label>
                <input
                  type="text" required value={formTitle} onChange={e => setFormTitle(e.target.value)}
                  placeholder="Review lead presentation, schedule follow-up..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-250 transition-colors"
                />
              </div>

              {/* Grid 2 Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Due Date */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Due Date & Time *</label>
                  <input
                    type="datetime-local" required value={formDueDate} onChange={e => setFormDueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-250 transition-colors"
                  />
                </div>

                {/* Assignee */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Assignee</label>
                  <select
                    value={formAssignee} onChange={e => setFormAssignee(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-250 transition-colors bg-white"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Type */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Task Type</label>
                  <select
                    value={formType} onChange={e => setFormType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-250 transition-colors bg-white"
                  >
                    {["call","whatsapp","email","meeting","demo","reminder","task","note"].map(t => (
                      <option key={t} value={t}>{nice(t)}</option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Priority</label>
                  <select
                    value={formPriority} onChange={e => setFormPriority(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-250 transition-colors bg-white"
                  >
                    {["low","medium","high","urgent"].map(p => (
                      <option key={p} value={p}>{nice(p)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Notes / Description</label>
                <textarea
                  value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={3}
                  placeholder="Add additional context, call topics, or meeting details here..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-250 transition-colors"
                />
              </div>

              {/* Footer */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button" onClick={() => setIsCreateOpen(false)}
                  className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-amber-500 py-3 text-sm font-bold text-white hover:bg-amber-600 disabled:bg-slate-350 transition-colors shadow shadow-amber-200 flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? "Creating..." : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                      Create Task
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
