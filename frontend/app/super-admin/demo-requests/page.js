"use client";

import WorkspacePage from "../../../components/dashboard/WorkspacePage";
import { DataPanel, RowList } from "../../../components/dashboard/WorkspaceBlocks";

export default function SuperAdminDemoRequestsPage() {
  return (
    <WorkspacePage
      title="Demo Requests"
      eyebrow="Inbound Demo Pipeline"
      allowedRoles={["super-admin"]}
      requestBuilder={() => [{ key: "requests", path: "/demo-requests?page_size=20" }]}
      heroStats={({ data }) => {
        const requests = data.requests?.items || [];
        return [
          { label: "Requests", value: requests.length },
          { label: "Pending", value: requests.filter((item) => item.status === "pending").length, color: "#f5a623" },
          { label: "Reviewed", value: requests.filter((item) => item.status !== "pending").length, color: "#1fc778" },
          { label: "Companies", value: new Set(requests.map((item) => item.company).filter(Boolean)).size },
        ];
      }}
    >
      {({ data, error, loading }) => {
        const requests = data.requests?.items || [];
        return (
          <>
            {error ? <div className="alert error">{error}</div> : null}
            {loading ? <div className="alert">Loading demo requests...</div> : null}
            {!loading ? (
              <section className="dashboard-grid">
                <DataPanel title="Demo Request Inbox" badge={`${requests.length} requests`} full>
                  <RowList
                    items={requests}
                    empty="No demo requests found."
                    renderItem={(item) => (
                      <div className="table-row" key={item.id}>
                        <div>
                          <strong>{item.name}</strong>
                          <span>{item.company || "No company"} · {item.email}</span>
                        </div>
                        <strong>{item.status}</strong>
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
