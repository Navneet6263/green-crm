"use client";

import WorkspacePage from "../../../components/dashboard/WorkspacePage";
import { DataPanel, KeyValueRows } from "../../../components/dashboard/WorkspaceBlocks";

export default function SuperAdminSecurityPage() {
  return (
    <WorkspacePage
      title="Security"
      eyebrow="Safety Controls"
      allowedRoles={["super-admin", "platform-admin"]}
      requestBuilder={() => [{ key: "safety", path: "/super-admin/safety-status" }]}
      heroStats={({ data }) => [
        { label: "Super Admins", value: data.safety?.super_admin_count || 0, color: "#a78bfa" },
        { label: "Inactive Admins", value: data.safety?.inactive_admins || 0, color: "#f5a623" },
        { label: "Suspended Companies", value: data.safety?.suspended_companies || 0, color: "#e05252" },
        { label: "Capacity Left", value: Math.max((data.safety?.max_super_admins || 0) - (data.safety?.super_admin_count || 0), 0) },
      ]}
    >
      {({ data, error, loading }) => (
        <>
          {error ? <div className="alert error">{error}</div> : null}
          {loading ? <div className="alert">Loading security status...</div> : null}
          {!loading ? (
            <section className="dashboard-grid">
              <DataPanel title="Safety Snapshot">
                <KeyValueRows
                  items={[
                    { label: "Super Admin Count", value: data.safety?.super_admin_count || 0, color: "#a78bfa" },
                    { label: "Maximum Allowed", value: data.safety?.max_super_admins || 0 },
                    { label: "Can Create More", value: data.safety?.can_create_more ? "Yes" : "No" },
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
