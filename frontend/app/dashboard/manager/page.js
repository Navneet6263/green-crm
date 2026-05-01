"use client";

import WorkspacePage from "../../../components/dashboard/WorkspacePage";
import { countByStatus, STATUS_ORDER } from "./manager-utils";
import ManagerDashboardView from "./ManagerDashboardView";

export default function ManagerDashboard() {
  return (
    <WorkspacePage
      title="Manager Dashboard"
      eyebrow="Team Workspace"
      hideTitle
      allowedRoles={["manager"]}
      requestBuilder={() => [
        { key: "summary", path: "/dashboard/summary" },
        { key: "leads", path: "/leads?page_size=8" },
        { key: "users", path: "/users?page_size=8" },
        { key: "tasks", path: "/tasks?page_size=8" },
        { key: "reminders", path: "/leads/reminders?page_size=10" },
      ]}
      heroStats={() => []}
    >
      {({ data, error, loading, session, refresh }) => {
        const summary = data?.summary || {};
        const leads = data?.leads?.items || [];
        const users = data?.users?.items || [];
        const tasks = data?.tasks?.items || [];
        const reminders = data?.reminders?.items || [];
        const leadCounts = summary.lead_counts || [];
        const sourceMix = summary.source_mix || [];

        const totalLeads = leadCounts.reduce((s, i) => s + Number(i.total || 0), 0);
        const wonLeads = countByStatus(leadCounts, "closed-won");
        const lostLeads = countByStatus(leadCounts, "closed-lost");
        const totalValue = leads.reduce((s, l) => s + Number(l.estimated_value || 0), 0);
        const pendingFollowups = summary.pending_reminders || reminders.length;
        const overdueTasks = tasks.filter((t) => t?.due_date && new Date(t.due_date) < new Date()).length;
        const activeUsers = users.filter((u) => u.is_active !== false).length;
        const convRate = totalLeads ? Math.round((wonLeads / totalLeads) * 100) : 0;
        const lostRate = totalLeads ? Math.round((lostLeads / totalLeads) * 100) : 0;

        const dashboardData = {
          activeUsers,
          convRate,
          error,
          leadCounts,
          leads,
          loading,
          lostLeads,
          lostRate,
          overdueTasks,
          pendingFollowups,
          refresh,
          session,
          sourceMix,
          statusOrder: STATUS_ORDER,
          totalLeads,
          totalValue,
          wonLeads,
        };

        return <ManagerDashboardView {...dashboardData} />;
      }}
    </WorkspacePage>
  );
}
