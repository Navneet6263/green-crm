"use client";

import WorkspacePage from "../../components/dashboard/WorkspacePage";
import { DataPanel, RowList } from "../../components/dashboard/WorkspaceBlocks";

export default function DocumentsPage() {
  return (
    <WorkspacePage
      title="Documents"
      eyebrow="Workflow Attachments"
      allowedRoles={["legal-team", "finance-team"]}
      requestBuilder={(session) => [{ key: "queue", path: "/workflow/my-assigned?page_size=12" }]}
      heroStats={({ data }) => {
        const queue = data.queue?.items || [];
        return [
          { label: "Assigned Leads", value: queue.length },
          { label: "Docs Count", value: queue.reduce((sum, item) => sum + Number(item.doc_count || 0), 0), color: "#4a9eff" },
          { label: "Ready", value: queue.filter((item) => item.agreement_status === "approved" || item.invoice_number).length, color: "#1fc778" },
          { label: "Pending", value: queue.filter((item) => item.agreement_status === "pending" || !item.invoice_number).length, color: "#f5a623" },
        ];
      }}
    >
      {({ data, error, loading, session }) => {
        const queue = data.queue?.items || [];
        return (
          <>
            {error ? <div className="alert error">{error}</div> : null}
            {loading ? <div className="alert">Loading documents...</div> : null}
            {!loading ? (
              <section className="dashboard-grid">
                <DataPanel title={session?.user?.role === "legal-team" ? "Legal Documents" : "Finance Documents"} badge={`${queue.length} leads`} full>
                  <RowList
                    items={queue}
                    empty="No document work assigned."
                    renderItem={(item) => (
                      <div className="table-row" key={item.lead_id}>
                        <div>
                          <strong>{item.company_name}</strong>
                          <span>{item.contact_person}</span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <strong>{item.doc_count || 0} docs</strong>
                          <span style={{ display: "block", fontSize: "0.82rem", color: "var(--muted)" }}>{item.workflow_stage}</span>
                        </div>
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
