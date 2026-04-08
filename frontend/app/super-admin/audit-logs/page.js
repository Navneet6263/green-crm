"use client";

import WorkspacePage from "../../../components/dashboard/WorkspacePage";
import { DataPanel, RowList } from "../../../components/dashboard/WorkspaceBlocks";

export default function SuperAdminAuditLogsPage() {
  return (
    <WorkspacePage
      title="Audit Logs"
      eyebrow="Platform Audit Trail"
      allowedRoles={["super-admin"]}
      requestBuilder={() => [{ key: "logs", path: "/audit-logs?page_size=20" }]}
      heroStats={({ data }) => {
        const logs = data.logs?.items || [];
        return [
          { label: "Recent Logs", value: logs.length },
          { label: "Company Scoped", value: logs.filter((log) => log.company_id).length, color: "#4a9eff" },
          { label: "Platform Scoped", value: logs.filter((log) => !log.company_id).length, color: "#a78bfa" },
          { label: "Unique Actions", value: new Set(logs.map((log) => log.action)).size },
        ];
      }}
    >
      {({ data, error, loading }) => {
        const logs = data.logs?.items || [];
        return (
          <>
            {error ? <div className="alert error">{error}</div> : null}
            {loading ? <div className="alert">Loading audit logs...</div> : null}
            {!loading ? (
              <section className="dashboard-grid">
                <DataPanel title="Audit Stream" badge={`${logs.length} entries`} full>
                  <RowList
                    items={logs}
                    empty="No audit logs found."
                    renderItem={(log) => (
                      <div className="table-row" key={log.audit_id}>
                        <div>
                          <strong>{log.action}</strong>
                          <span>{log.user_email || "System"} · {new Date(log.logged_at).toLocaleString("en-IN")}</span>
                        </div>
                        <strong>{log.user_role || "platform"}</strong>
                      </div>
                    )}
                  />
                </DataPanel>
              </section>
            ) : null}
          </>
        );
      }}
    </WorkspacePage>
  );
}
