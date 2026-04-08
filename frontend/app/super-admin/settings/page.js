"use client";

import WorkspacePage from "../../../components/dashboard/WorkspacePage";
import { DataPanel, KeyValueRows } from "../../../components/dashboard/WorkspaceBlocks";

export default function SuperAdminSettingsPage() {
  return (
    <WorkspacePage
      title="System Settings"
      eyebrow="Platform Defaults"
      allowedRoles={["super-admin"]}
      requestBuilder={() => [
        { key: "summary", path: "/dashboard/summary" },
        { key: "safety", path: "/super-admin/safety-status" },
      ]}
      heroStats={({ data }) => [
        { label: "Products", value: data.summary?.products || 0 },
        { label: "Companies", value: data.summary?.companies || 0, color: "#4a9eff" },
        { label: "Users", value: data.summary?.users || 0, color: "#1fc778" },
        { label: "Safety", value: data.safety?.can_create_more ? "Healthy" : "At Limit", color: data.safety?.can_create_more ? "#1fc778" : "#f5a623" },
      ]}
    >
      {({ data, error, loading }) => (
        <>
          {error ? <div className="alert error">{error}</div> : null}
          {loading ? <div className="alert">Loading system settings...</div> : null}
          {!loading ? (
            <section className="dashboard-grid">
              <DataPanel title="Platform Defaults">
                <KeyValueRows
                  items={[
                    { label: "Default API Host", value: "localhost:5000" },
                    { label: "Frontend Host", value: "localhost:3000" },
                    { label: "Tenant Count", value: data.summary?.companies || 0 },
                    { label: "Create More Super Admins", value: data.safety?.can_create_more ? "Allowed" : "Blocked" },
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
