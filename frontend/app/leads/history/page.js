"use client";

import WorkspacePage from "../../../components/dashboard/WorkspacePage";
import { DataPanel, RowList } from "../../../components/dashboard/WorkspaceBlocks";

export default function LeadHistoryPage() {
  return (
    <WorkspacePage
      title="Lead History"
      eyebrow="Pipeline Timeline"
      allowedRoles={["super-admin", "admin", "manager", "sales", "marketing", "viewer"]}
      requestBuilder={() => [{ key: "leads", path: "/leads?page_size=20" }]}
      heroStats={({ data }) => {
        const leads = data.leads?.items || [];
        return [
          { label: "Recent Leads", value: leads.length },
          { label: "Open Pipeline", value: leads.filter((lead) => !["closed-won", "closed-lost"].includes(lead.status)).length, color: "#4a9eff" },
          { label: "Won", value: leads.filter((lead) => lead.status === "closed-won").length, color: "#1fc778" },
          { label: "Lost", value: leads.filter((lead) => lead.status === "closed-lost").length, color: "#e05252" },
        ];
      }}
    >
      {({ data, error, loading }) => {
        const leads = data.leads?.items || [];
        return (
          <>
            {error ? <div className="alert error">{error}</div> : null}
            {loading ? <div className="alert">Loading history...</div> : null}
            {!loading ? (
              <section className="dashboard-grid">
                <DataPanel title="Recent Lead Timeline" badge={`${leads.length} rows`} full>
                  <RowList
                    items={leads}
                    empty="No lead history found."
                    renderItem={(lead) => (
                      <div className="table-row" key={lead.lead_id}>
                        <div>
                          <strong>{lead.company_name}</strong>
                          <span>{lead.contact_person} · {new Date(lead.created_at).toLocaleDateString("en-IN")}</span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span>{lead.status}</span>
                          <span style={{ display: "block", fontSize: "0.82rem", color: "var(--muted)" }}>{lead.workflow_stage}</span>
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
