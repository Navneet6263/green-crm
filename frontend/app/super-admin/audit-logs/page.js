"use client";

import WorkspacePage from "../../../components/dashboard/WorkspacePage";
import AuditLogsContent from "../../../components/superadmin/AuditLogsContent";

export default function SuperAdminAuditLogsPage() {
  return (
    <WorkspacePage
      title="Audit Logs"
      allowedRoles={["super-admin"]}
      hideTitle
      requestBuilder={() => [{ key: "logs", path: "/audit-logs?page_size=60" }]}
    >
      {(props) => <AuditLogsContent {...props} />}
    </WorkspacePage>
  );
}
