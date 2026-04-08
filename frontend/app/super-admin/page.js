"use client";

import WorkspacePage from "../../components/dashboard/WorkspacePage";
import { DataPanel, KeyValueRows } from "../../components/dashboard/WorkspaceBlocks";

export default function SuperAdminPanelPage() {
  return (
    <WorkspacePage
      title="Super Admin Panel"
      eyebrow="Platform Control"
      allowedRoles={["super-admin"]}
      requestBuilder={() => [
        { key: "summary", path: "/dashboard/summary" },
        { key: "safety", path: "/super-admin/safety-status" },
      ]}
      heroStats={({ data }) => [
        { label: "Companies", value: data.summary?.companies || 0 },
        { label: "Users", value: data.summary?.users || 0 },
        { label: "Leads", value: data.summary?.leads || 0 },
        { label: "Super Admins", value: data.safety?.super_admin_count || 0, color: "#a78bfa" },
      ]}
    >
      {({ data, error, loading }) => (
        <>
          {error ? <div className="alert error">{error}</div> : null}
          {loading ? <div className="alert">Loading platform control...</div> : null}
          {!loading ? (
            <section className="dashboard-grid">
              <DataPanel title="Platform Summary">
                <KeyValueRows
                  items={[
                    { label: "Companies", value: data.summary?.companies || 0 },
                    { label: "Users", value: data.summary?.users || 0 },
                    { label: "Leads", value: data.summary?.leads || 0 },
                    { label: "Products", value: data.summary?.products || 0 },
                  ]}
                />
              </DataPanel>

              <DataPanel title="Safety Status">
                <KeyValueRows
                  items={[
                    { label: "Super Admin Count", value: data.safety?.super_admin_count || 0, color: "#a78bfa" },
                    { label: "Max Allowed", value: data.safety?.max_super_admins || 0 },
                    { label: "Inactive Admins", value: data.safety?.inactive_admins || 0, color: "#f5a623" },
                    { label: "Suspended Companies", value: data.safety?.suspended_companies || 0, color: "#e05252" },
                  ]}
                />
              </DataPanel>
            </section>
          ) : null}
        </>
      )}
    </WorkspacePage>
  );
}
