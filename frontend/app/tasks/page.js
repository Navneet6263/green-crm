"use client";

import WorkspacePage from "../../components/dashboard/WorkspacePage";
import { DataPanel, RowList } from "../../components/dashboard/WorkspaceBlocks";

export default function TasksPage() {
  return (
    <WorkspacePage
      title="Tasks"
      eyebrow="Execution Queue"
      allowedRoles={["super-admin", "admin", "manager", "sales", "marketing", "legal-team", "finance-team", "support"]}
      requestBuilder={() => [{ key: "tasks", path: "/tasks?page_size=20" }]}
      heroStats={({ data }) => {
        const tasks = data.tasks?.items || [];
        return [
          { label: "Pending", value: tasks.filter((task) => task.status === "pending").length, color: "#f5a623" },
          { label: "Done", value: tasks.filter((task) => task.status === "done").length, color: "#1fc778" },
          { label: "Overdue", value: tasks.filter((task) => task.status === "pending" && new Date(task.due_date) < new Date()).length, color: "#e05252" },
          { label: "Total Tasks", value: tasks.length },
        ];
      }}
    >
      {({ data, error, loading }) => {
        const tasks = data.tasks?.items || [];
        return (
          <>
            {error ? <div className="alert error">{error}</div> : null}
            {loading ? <div className="alert">Loading tasks...</div> : null}
            {!loading ? (
              <section className="dashboard-grid">
                <DataPanel title="Task List" badge={`${tasks.length} tasks`} full>
                  <RowList
                    items={tasks}
                    empty="No tasks found."
                    renderItem={(task) => (
                      <div className="table-row" key={task.task_id}>
                        <div>
                          <strong>{task.title}</strong>
                          <span>{task.type} · {task.assigned_to_name || "Unassigned"}</span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <strong>{task.status}</strong>
                          <span style={{ display: "block", fontSize: "0.82rem", color: "var(--muted)" }}>{new Date(task.due_date).toLocaleDateString("en-IN")}</span>
                        </div>
                      </div>
                    )}
                  />
                </DataPanel>
              </section>
            ) : null}
          </>
        );
      }}
    </WorkspacePage>
  );
}
