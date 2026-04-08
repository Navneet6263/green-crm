"use client";

import WorkspacePage from "../../components/dashboard/WorkspacePage";
import { DataPanel, KeyValueRows, RowList } from "../../components/dashboard/WorkspaceBlocks";

export default function WorkflowPage() {
  return (
    <WorkspacePage
      title="Workflow Tracker"
      eyebrow="Sales to Legal to Finance"
      allowedRoles={["super-admin", "admin", "manager"]}
      requestBuilder={() => [{ key: "tracker", path: "/workflow/tracker?page_size=12" }]}
      heroStats={({ data }) => {
        const leads = data.tracker?.items || [];
        return [
          { label: "Tracked Leads", value: leads.length },
          { label: "Legal", value: leads.filter((lead) => lead.workflow_stage === "legal").length, color: "#f59e0b" },
          { label: "Finance", value: leads.filter((lead) => lead.workflow_stage === "finance").length, color: "#fb923c" },
          { label: "Completed", value: leads.filter((lead) => lead.workflow_stage === "completed").length, color: "#1fc778" },
        ];
      }}
    >
      {({ data, error, loading }) => {
        const leads = data.tracker?.items || [];
        return (
          <>
            {error ? <div className="alert error">{error}</div> : null}
            {loading ? <div className="alert">Loading workflow tracker...</div> : null}
            {!loading ? (
              <section className="dashboard-grid">
                <DataPanel title="Workflow Queue" badge={`${leads.length} leads`} full>
                  <RowList
                    items={leads}
                    empty="No workflow leads found."
                    renderItem={(lead) => (
                      <div className="table-row" key={lead.lead_id}>
                        <div>
                          <strong>{lead.company_name}</strong>
                          <span>{lead.contact_person} · {lead.created_by_name || "Unknown owner"}</span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <strong>{lead.workflow_stage}</strong>
                          <span style={{ display: "block", fontSize: "0.82rem", color: "var(--muted)" }}>{lead.assigned_to_name || lead.legal_owner_name || lead.finance_owner_name || "Unassigned"}</span>
                        </div>
                      </div>
                    )}
                  />
                </DataPanel>

                <DataPanel title="Stage Summary">
                  <KeyValueRows
                    items={[
                      { label: "Sales Stage", value: leads.filter((lead) => lead.workflow_stage === "sales").length },
                      { label: "Legal Stage", value: leads.filter((lead) => lead.workflow_stage === "legal").length, color: "#f59e0b" },
                      { label: "Finance Stage", value: leads.filter((lead) => lead.workflow_stage === "finance").length, color: "#fb923c" },
                      { label: "Completed", value: leads.filter((lead) => lead.workflow_stage === "completed").length, color: "#1fc778" },
                    ]}
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
