"use client";

import WorkspacePage from "../../components/dashboard/WorkspacePage";
import { DataPanel, RowList } from "../../components/dashboard/WorkspaceBlocks";

export default function SupportPage() {
  return (
    <WorkspacePage
      title="Support Center"
      eyebrow="Support Tickets"
      allowedRoles={["admin", "support"]}
      requestBuilder={() => [
        { key: "tasks", path: "/tasks?page_size=12" },
        { key: "notifications", path: "/notifications?page_size=8" },
      ]}
      heroStats={({ data }) => {
        const tasks = data.tasks?.items || [];
        const notifications = data.notifications?.items || [];
        return [
          { label: "Open Tasks", value: tasks.filter((task) => task.status === "pending").length, color: "#f5a623" },
          { label: "Unread Alerts", value: notifications.filter((item) => !item.is_read).length, color: "#e05252" },
          { label: "Resolved", value: tasks.filter((task) => task.status === "done").length, color: "#1fc778" },
          { label: "Inbox", value: notifications.length },
        ];
      }}
    >
      {({ data, error, loading }) => {
        const tasks = data.tasks?.items || [];
        const notifications = data.notifications?.items || [];
        return (
          <>
            {error ? <div className="alert error">{error}</div> : null}
            {loading ? <div className="alert">Loading support center...</div> : null}
            {!loading ? (
              <section className="dashboard-grid">
                <DataPanel title="Support Queue" badge={`${tasks.length} tasks`}>
                  <RowList
                    items={tasks}
                    empty="No support tasks."
                    renderItem={(task) => (
                      <div className="table-row" key={task.task_id}>
                        <div>
                          <strong>{task.title}</strong>
                          <span>{task.type} · {task.priority}</span>
                        </div>
                        <strong>{task.status}</strong>
                      </div>
                    )}
                  />
                </DataPanel>

                <DataPanel title="Inbox" badge={`${notifications.length} alerts`}>
                  <RowList
                    items={notifications}
                    empty="No notifications."
                    renderItem={(item) => (
                      <div className="table-row" key={item.notif_id}>
                        <div>
                          <strong>{item.title}</strong>
                          <span>{item.message}</span>
                        </div>
                        <strong>{item.is_read ? "Read" : "Unread"}</strong>
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
