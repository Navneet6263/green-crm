"use client";

import WorkspacePage from "../../components/dashboard/WorkspacePage";
import SuperAdminDashboardContent from "../../components/superadmin/SuperAdminDashboardContent";

export default function SuperAdminDashboard() {
  return (
    <WorkspacePage
      title="Super Admin Console"
      allowedRoles={["super-admin", "platform-admin", "platform-manager"]}
      hideTitle
      requestBuilder={(session) => [
        { key: "summary", path: "/dashboard/summary" },
        { key: "companies", path: "/companies?page_size=8" },
        { key: "users", path: "/users?page_size=8" },
        { key: "leads", path: "/leads?page_size=8" },
        { key: "unassignedLeads", path: "/leads?page_size=6&quick_filter=unassigned" },
        { key: "tasks", path: "/tasks?page_size=8&status=pending" },
        { key: "customers", path: "/customers?page_size=1" },
        { key: "teams", path: "/teams?page_size=1" },
        ...(["super-admin", "platform-admin"].includes(session?.user?.role) ? [{ key: "safety", path: "/super-admin/safety-status" }] : []),
        ...(session?.user?.role === "super-admin" ? [{ key: "demoRequests", path: "/demo-requests?page_size=4&status=pending" }] : []),
        ...(session?.user?.role === "super-admin" ? [{ key: "auditLogs", path: "/audit-logs?page_size=6" }] : []),
      ]}
    >
      {(props) => <SuperAdminDashboardContent {...props} />}
    </WorkspacePage>
  );
}
