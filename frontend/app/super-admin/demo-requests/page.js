"use client";

import WorkspacePage from "../../../components/dashboard/WorkspacePage";
import DemoRequestsContent from "../../../components/superadmin/DemoRequestsContent";

export default function SuperAdminDemoRequestsPage() {
  return (
    <WorkspacePage
      title="Demo Requests"
      allowedRoles={["super-admin"]}
      hideTitle
      requestBuilder={() => [{ key: "requests", path: "/demo-requests?page_size=40" }]}
    >
      {(props) => <DemoRequestsContent {...props} />}
    </WorkspacePage>
  );
}
