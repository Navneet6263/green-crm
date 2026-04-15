"use client";

import WorkspacePage from "../../../components/dashboard/WorkspacePage";
import PlatformCompaniesContent from "../../../components/superadmin/PlatformCompaniesContent";

export default function SuperAdminCompaniesPage() {
  return (
    <WorkspacePage
      title="Companies"
      allowedRoles={["super-admin", "platform-admin", "platform-manager"]}
      hideTitle
      requestBuilder={() => [{ key: "companies", path: "/companies?page_size=24" }]}
    >
      {(props) => <PlatformCompaniesContent {...props} />}
    </WorkspacePage>
  );
}
