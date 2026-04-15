"use client";

import WorkspacePage from "../../../components/dashboard/WorkspacePage";
import SecurityContent from "../../../components/superadmin/SecurityContent";

export default function SuperAdminSecurityPage() {
  return (
    <WorkspacePage
      title="Security"
      allowedRoles={["super-admin", "platform-admin"]}
      hideTitle
      requestBuilder={() => [
        { key: "safety", path: "/super-admin/safety-status" },
        { key: "users", path: "/super-admin/users?page_size=120" },
        { key: "companies", path: "/companies?page_size=120" },
      ]}
    >
      {(props) => <SecurityContent {...props} />}
    </WorkspacePage>
  );
}
