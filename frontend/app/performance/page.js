"use client";

import WorkspacePage from "../../components/dashboard/WorkspacePage";
import { DataPanel, RowList } from "../../components/dashboard/WorkspaceBlocks";

export default function PerformancePage() {
  return (
    <WorkspacePage
      title="Team Performance"
      eyebrow="User Output"
      allowedRoles={["manager", "admin"]}
      requestBuilder={() => [
        { key: "users", path: "/users?page_size=12" },
        { key: "tasks", path: "/tasks?page_size=20" },
      ]}
      heroStats={({ data }) => {
        const users = data.users?.items || [];
        const tasks = data.tasks?.items || [];
        return [
          { label: "Team Members", value: users.length },
          { label: "Pending Tasks", value: tasks.filter((task) => task.status === "pending").length, color: "#f5a623" },
          { label: "Done Tasks", value: tasks.filter((task) => task.status === "done").length, color: "#1fc778" },
          { label: "Assigned Tasks", value: tasks.filter((task) => task.assigned_to).length },
        ];
      }}
    >
      {({ data, error, loading }) => {
        const users = data.users?.items || [];
        const tasks = data.tasks?.items || [];
        return (
          <>
            {error ? <div className="alert error">{error}</div> : null}
            {loading ? <div className="alert">Loading performance data...</div> : null}
            {!loading ? (
              <section className="dashboard-grid">
                <DataPanel title="Team Directory" badge={`${users.length} members`}>
                  <RowList
                    items={users}
                    empty="No users found."
                    renderItem={(user) => (
                      <div className="table-row" key={user.user_id}>
                        <div>
                          <strong>{user.name}</strong>
                          <span>{user.role} · {user.talent_id}</span>
                        </div>
                        <strong>{tasks.filter((task) => task.assigned_to === user.user_id).length} tasks</strong>
                      </div>
                    )}
                  />
                </DataPanel>

                <DataPanel title="Upcoming Work" badge={`${tasks.length} tasks`}>
                  <RowList
                    items={tasks.slice(0, 10)}
                    empty="No tasks found."
                    renderItem={(task) => (
                      <div className="table-row" key={task.task_id}>
                        <div>
                          <strong>{task.title}</strong>
                          <span>{task.assigned_to_name || "Unassigned"}</span>
                        </div>
                        <strong>{task.status}</strong>
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
