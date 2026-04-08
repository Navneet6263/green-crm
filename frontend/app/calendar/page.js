"use client";

import WorkspacePage from "../../components/dashboard/WorkspacePage";
import { DataPanel, RowList } from "../../components/dashboard/WorkspaceBlocks";

export default function CalendarPage() {
  return (
    <WorkspacePage
      title="Calendar"
      eyebrow="Upcoming Due Dates"
      allowedRoles={["super-admin", "admin", "manager", "sales", "marketing", "legal-team", "finance-team", "support"]}
      requestBuilder={() => [{ key: "tasks", path: "/tasks?page_size=20" }]}
      heroStats={({ data }) => {
        const tasks = data.tasks?.items || [];
        return [
          { label: "This Week", value: tasks.length },
          { label: "Meetings", value: tasks.filter((task) => task.type === "meeting").length, color: "#4a9eff" },
          { label: "Calls", value: tasks.filter((task) => task.type === "call").length, color: "#1fc778" },
          { label: "Follow-ups", value: tasks.filter((task) => task.type === "follow-up").length, color: "#f5a623" },
        ];
      }}
    >
      {({ data, error, loading }) => {
        const tasks = [...(data.tasks?.items || [])].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
        return (
          <>
            {error ? <div className="alert error">{error}</div> : null}
            {loading ? <div className="alert">Loading calendar...</div> : null}
            {!loading ? (
              <section className="dashboard-grid">
                <DataPanel title="Upcoming Schedule" badge={`${tasks.length} items`} full>
                  <RowList
                    items={tasks}
                    empty="No scheduled tasks."
                    renderItem={(task) => (
                      <div className="table-row" key={task.task_id}>
                        <div>
                          <strong>{new Date(task.due_date).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</strong>
                          <span>{task.title}</span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <strong>{task.type}</strong>
                          <span style={{ display: "block", fontSize: "0.82rem", color: "var(--muted)" }}>{task.assigned_to_name || "Unassigned"}</span>
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
