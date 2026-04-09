"use client";

import WorkspacePage from "../../components/dashboard/WorkspacePage";

const PANEL_CLASS = "rounded-[30px] border border-[#eadfcd] bg-white/82 p-5 shadow-[0_14px_36px_rgba(79,58,22,0.06)] md:p-6";
const KICKER_CLASS = "text-[10px] font-black uppercase tracking-[0.28em] text-[#9a886d]";

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
      allowedRoles={["super-admin", "admin", "manager", "sales", "marketing", "legal-team", "finance-team", "support"]}
      requestBuilder={() => [{ key: "tasks", path: "/tasks?page_size=20" }]}
      heroStats={() => []}
    >
      {({ data, error, loading }) => {
        const tasks = data.tasks?.items || [];
        const pending = tasks.filter((task) => task.status === "pending");
        const done = tasks.filter((task) => task.status === "done");
        const overdue = tasks.filter((task) => task.status === "pending" && task.due_date && new Date(task.due_date) < new Date());

        return (
          <>
            {error ? <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}
            {loading ? <div className="rounded-[20px] border border-[#eadfcd] bg-white px-4 py-3 text-sm font-medium text-[#6f614c]">Loading tasks...</div> : null}
            {!loading ? (
              <section className="space-y-5">
                <article className="rounded-[34px] border border-[#eadfcd] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(247,240,227,0.96)_42%,_rgba(241,232,215,1)_100%)] p-5 shadow-[0_22px_60px_rgba(79,58,22,0.08)] md:p-7">
                  <div className="space-y-4">
                    <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
                      Task Board
                    </span>
                    <h2 className="text-4xl font-semibold tracking-tight text-[#060710] md:text-[3rem] md:leading-[1.04]">
                      Daily execution queue, cleaned into one sharper task surface.
                    </h2>
                    <p className="max-w-3xl text-sm leading-7 text-[#746853] md:text-base">
                      Review pending work, catch overdue follow-ups, and keep the team moving without the old dashboard clutter.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {[
                        { label: "Pending", value: pending.length },
                        { label: "Done", value: done.length },
                        { label: "Overdue", value: overdue.length },
                        { label: "Total Tasks", value: tasks.length },
                      ].map((item, index) => (
                        <article key={item.label} className={`rounded-[24px] border border-[#eadfcd] p-4 shadow-[0_12px_28px_rgba(79,58,22,0.05)] ${index === 0 ? "bg-[#fff6e4]" : "bg-white/82"}`}>
                          <p className={KICKER_CLASS}>{item.label}</p>
                          <p className="mt-4 text-2xl font-semibold tracking-tight text-[#060710]">{item.value}</p>
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
                    <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                      {tasks.length} tasks loaded
                    </span>
                  </div>

                  <div className="space-y-3">
                    {tasks.length ? tasks.map((task) => (
                      <article key={task.task_id} className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-2">
                              <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                                {nice(task.type || "task")}
                              </span>
                              <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${task.status === "done" ? "bg-emerald-100 text-emerald-700" : task.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}`}>
                                {nice(task.status || "pending")}
                              </span>
                            </div>
                            <h4 className="text-lg font-semibold text-[#060710]">{task.title || "Untitled task"}</h4>
                            <p className="text-sm text-[#746853]">{task.notes || "No task notes added yet."}</p>
                          </div>
                          <div className="grid gap-3 text-sm text-[#7a6b57] md:min-w-[220px]">
                            <div><strong className="block text-[#060710]">Due</strong><span>{when(task.due_date)}</span></div>
                            <div><strong className="block text-[#060710]">Assignee</strong><span>{task.assigned_to_name || "Unassigned"}</span></div>
                            <div><strong className="block text-[#060710]">Priority</strong><span>{nice(task.priority || "medium")}</span></div>
                          </div>
                        </div>
                      </article>
                    )) : (
                      <div className="rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-14 text-center text-sm text-[#7a6b57]">
                        No tasks found.
                      </div>
                    )}
                  </div>
                </article>
              </section>
            ) : null}
          </>
        );
      }}
    </WorkspacePage>
  );
}
