"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";
import DashboardShell from "../../../components/dashboard/DashboardShell";

const STATUS_COLOR = { new: "#4a9eff", contacted: "#38bdf8", qualified: "#a78bfa", proposal: "#f5a623", "closed-won": "#1fc778", "closed-lost": "#e05252" };

export default function ViewerDashboard() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [leads, setLeads]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    const s = loadSession();
    if (!s) { router.replace("/login"); return; }
    if (s.user?.role !== "viewer") { router.replace("/login"); return; }
    setSession(s);
    apiRequest("/leads?page_size=20", { token: s.token })
      .then(r => setLeads(r.items || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const heroStats = [
    { label: "Total Leads", value: leads.length },
    { label: "Won",         value: leads.filter(l => l.status === "closed-won").length,  color: "#1fc778" },
    { label: "Active",      value: leads.filter(l => !["closed-won","closed-lost"].includes(l.status)).length },
    { label: "Access",      value: "Read Only", color: "#94a3b8" },
  ];

  return (
    <DashboardShell session={session} title="Viewer Dashboard" eyebrow="Read Only Access" heroStats={heroStats}>
      {error && <div className="alert error">{error}</div>}
      {loading && <div className="alert">Loading leads...</div>}
      {!loading && (
        <article className="panel">
          <div className="panel-header"><h2>All Leads</h2><span className="pill">{leads.length} shown</span></div>
          <div className="table-stack">
            {leads.length ? leads.map(l => (
              <div className="table-row" key={l.lead_id}>
                <div><strong>{l.company_name}</strong><span>{l.contact_person} · {l.lead_source}</span></div>
                <div style={{ textAlign: "right" }}>
                  <span className="status-badge" style={{ "--sc": STATUS_COLOR[l.status] || "#999" }}>{l.status}</span>
                  <span style={{ fontSize: "0.8rem", color: "var(--muted)", display: "block" }}>₹{Number(l.estimated_value || 0).toLocaleString("en-IN")}</span>
                </div>
              </div>
            )) : <p className="muted">No leads to display.</p>}
          </div>
        </article>
      )}
    </DashboardShell>
  );
}
