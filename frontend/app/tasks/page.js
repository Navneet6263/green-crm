"use client";

import Link from "next/link";
import { useState } from "react";
import WorkspacePage from "../../components/dashboard/WorkspacePage";
import DashboardIcon from "../../components/dashboard/icons";
import { apiRequest } from "../../lib/api";
import { teamBadgeLabel } from "../../lib/teamScope";
import { AlertError, AlertSuccess } from "../../components/ui/Alert";

const PANEL_CLASS = "rounded-2xl border border-[#eadfcd] bg-white/82 p-4 shadow-[0_8px_24px_rgba(79,58,22,0.05)] md:p-5";
const KICKER_CLASS = "text-[10px] font-bold uppercase tracking-[0.22em] text-[#9a886d]";

function nice(value = "") {
  return String(value)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function when(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TasksPage() {
  return (
    <WorkspacePage
      title="Tasks"
      eyebrow="Execution Queue"
      hideTitle
      allowedRoles={["super-admin", "platform-admin", "platform-manager", "admin", "manager", "sales", "marketing", "legal-team", "finance-team", "support"]}
      requestBuilder={() => [{ key: "tasks", path: "/tasks?page_size=20" }]}
      heroStats={() => []}
    >
      {({ data, error, loading, session, refresh }) => {
        const tasks = data.tasks?.items || [];
        const pending = tasks.filter((task) => task.status === "pending");
        const done = tasks.filter((task) => task.status === "done");
        const overdue = tasks.filter((task) => task.status === "pending" && task.due_date && new Date(task.due_date) < new Date());

        return <TasksContent tasks={tasks} pending={pending} done={done} overdue={overdue} error={error} loading={loading} session={session} refresh={refresh} />;
      }}
    </WorkspacePage>
  );
}

function TasksContent({ tasks, pending, done, overdue, error: loadError, loading, session, refresh }) {
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  async function toggleTaskStatus(task) {
    if (!session?.token || !task?.task_id) return;
    const nextStatus = task.status === "done" ? "pending" : "done";
    setUpdatingId(task.task_id);
    setActionError("");
    setActionNotice("");
    try {
      await apiRequest(`/tasks/${task.task_id}`, {
        method: "PATCH",
        token: session.token,
        body: { status: nextStatus },
      });
      setActionNotice(`Task marked as ${nextStatus}.`);
      if (refresh) await refresh();
    } catch (e) {
      setActionError(e.message || "Could not update task.");
    } finally {
      setUpdatingId("");
    }
  }

  return (
          <>
            {loadError ? <AlertError message={loadError} /> : null}
            <AlertError message={actionError} onDismiss={() => setActionError("")} />
            <AlertSuccess message={actionNotice} onDismiss={() => setActionNotice("")} />
            {loading ? <div className="rounded-[20px] border border-[#eadfcd] bg-white px-4 py-3 text-sm font-medium text-[#6f614c]">Loading tasks...</div> : null}
            {!loading ? (
              <section className="space-y-5">
                <article className="rounded-2xl border border-[#eadfcd] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(247,240,227,0.96)_42%,_rgba(241,232,215,1)_100%)] p-4 shadow-[0_12px_36px_rgba(79,58,22,0.06)] md:p-5">
                  <div className="space-y-3">
                    <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
                      Task Board
                    </span>
                    <h2 className="text-3xl font-semibold tracking-tight text-[#060710] md:text-[2.2rem] md:leading-[1.08]">
                      Task Board
                    </h2>
                    <p className="max-w-3xl text-sm leading-7 text-[#746853]">
                      Pending tasks arrive team-scoped from the CRM backend.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      {[
                        { label: "Pending", value: pending.length },
                        { label: "Done", value: done.length },
                        { label: "Overdue", value: overdue.length },
                        { label: "Total", value: tasks.length },
                      ].map((item, index) => (
                        <article key={item.label} className={`rounded-xl border border-[#eadfcd] px-3 py-2.5 ${index === 0 ? "bg-[#fff6e4]" : "bg-white/82"}`}>
                          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#9a886d]">{item.label}</p>
                          <p className="mt-1 text-xl font-semibold tracking-tight text-[#060710]">{item.value}</p>
                        </article>
                      ))}
                    </div>
                  </div>
                </article>

                <article className={PANEL_CLASS}>
                  <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className={KICKER_CLASS}>Task List</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">All active work</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                        {tasks.length} tasks loaded
                      </span>
                      <Link href="/leads" prefetch={false} className="inline-flex min-h-[38px] items-center gap-2 rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55] transition hover:border-[#d7b258] hover:text-[#060710]">
                        <DashboardIcon name="leads" className="h-3.5 w-3.5" />
                        Create from Lead
                      </Link>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {tasks.length ? tasks.map((task) => (
                      <article key={task.task_id} className="rounded-xl border border-[#eadfcd] bg-[#fffaf1] p-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-2">
                              <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                                {nice(task.type || "task")}
                              </span>
                              <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${task.status === "done" ? "bg-emerald-100 text-emerald-700" : task.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}`}>
                                {nice(task.status || "pending")}
                              </span>
                              {teamBadgeLabel(task) ? (
                                <span className="inline-flex rounded-full border border-[#eadfcd] bg-[#fff4d9] px-3 py-1 text-[11px] font-bold text-[#8d6e27]">
                                  {teamBadgeLabel(task)}
                                </span>
                              ) : null}
                            </div>
                            <h4 className="text-lg font-semibold text-[#060710]">{task.title || "Untitled task"}</h4>
                            <p className="text-sm text-[#746853]">{task.notes || "No task notes added yet."}</p>
                          </div>
                          <div className="flex flex-wrap gap-3 md:min-w-[220px] md:justify-end">
                            <div className="grid gap-3 text-sm text-[#7a6b57]">
                              <div><strong className="block text-[#060710]">Due</strong><span>{when(task.due_date)}</span></div>
                              <div><strong className="block text-[#060710]">Assignee</strong><span>{task.assigned_to_name || "Unassigned"}</span></div>
                              <div><strong className="block text-[#060710]">Priority</strong><span>{nice(task.priority || "medium")}</span></div>
                            </div>
                            <button
                              type="button"
                              disabled={updatingId === task.task_id}
                              onClick={() => toggleTaskStatus(task)}
                              className={`inline-flex min-h-[38px] items-center gap-2 self-start rounded-full border px-3 py-1.5 text-xs font-bold transition hover:-translate-y-0.5 disabled:opacity-60 ${
                                task.status === "done"
                                  ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }`}
                            >
                              {updatingId === task.task_id
                                ? "Updating..."
                                : task.status === "done"
                                  ? "Reopen"
                                  : "Mark Done"}
                            </button>
                          </div>
                        </div>
                      </article>
                    )) : (
                      <div className="rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-14 text-center text-sm text-[#7a6b57]">
                        No team-scoped tasks are available right now.
                      </div>
                    )}
                  </div>
                </article>
              </section>
            ) : null}
          </>
  );
}
