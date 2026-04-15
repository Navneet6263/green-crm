"use client";

import WorkspacePage from "../../../components/dashboard/WorkspacePage";
import SystemSettingsContent from "../../../components/superadmin/SystemSettingsContent";

export default function SuperAdminSettingsPage() {
  return (
    <WorkspacePage
      title="System Settings"
      allowedRoles={["super-admin"]}
      hideTitle
      requestBuilder={() => [
        { key: "summary", path: "/dashboard/summary" },
        { key: "safety", path: "/super-admin/safety-status" },
        { key: "platform", path: "/companies/platform-root" },
      ]}
    >
      {(props) => <SystemSettingsContent {...props} />}
    </WorkspacePage>
  );
}
