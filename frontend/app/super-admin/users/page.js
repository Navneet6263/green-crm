"use client";

import WorkspacePage from "../../../components/dashboard/WorkspacePage";
import PlatformUsersContent from "../../../components/superadmin/PlatformUsersContent";

export default function SuperAdminUsersPage() {
  return (
    <WorkspacePage
      title="Platform Users"
      allowedRoles={["super-admin", "platform-admin"]}
      hideTitle
      requestBuilder={() => [
        { key: "users", path: "/super-admin/users?page_size=120" },
        { key: "companies", path: "/companies?page_size=120" },
        { key: "safety", path: "/super-admin/safety-status" },
      ]}
    >
      {(props) => <PlatformUsersContent {...props} />}
    </WorkspacePage>
  );
}
