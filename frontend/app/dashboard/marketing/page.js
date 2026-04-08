"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";
import DashboardShell from "../../../components/dashboard/DashboardShell";

const STATUS_COLOR = { new: "#4a9eff", contacted: "#38bdf8", qualified: "#a78bfa", proposal: "#f5a623", "closed-won": "#1fc778" };

export default function MarketingDashboard() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [summary, setSummary] = useState({});
  const [leads, setLeads]     = useState([]);
  const [tasks, setTasks]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    const s = loadSession();
    if (!s) { router.replace("/login"); return; }
    if (s.user?.role !== "marketing") { router.replace("/login"); return; }
    setSession(s);
    Promise.all([
      apiRequest("/dashboard/summary", { token: s.token }),
      apiRequest("/leads?page_size=8", { token: s.token }),
      apiRequest("/tasks?page_size=5", { token: s.token }),
    ]).then(([sum, lds, tsk]) => {
      setSummary(sum); setLeads(lds.items || []); setTasks(tsk.items || []);
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const totalLeads = (summary.lead_counts || []).reduce((s, i) => s + Number(i.total), 0);
  const sources    = [...new Set(leads.map(l => l.lead_source).filter(Boolean))];

  const heroStats = [
    { label: "Leads Created",  value: totalLeads },
    { label: "Sources Active", value: sources.length },
    { label: "Tasks Due",      value: tasks.length, color: "#f5a623" },
    { label: "Qualified",      value: (summary.lead_counts || []).find(i => i.status === "qualified")?.total || 0, color: "#a78bfa" },
  ];

  return (
    <DashboardShell session={session} title="Marketing Dashboard" eyebrow="Campaign & Inbound" heroStats={heroStats}>
      {error && <div className="alert error">{error}</div>}
      {loading && <div className="alert">Loading dashboard...</div>}
      {!loading && (
        <>
          <section className="card-grid">
            {(summary.lead_counts || []).map(item => (
              <article className="metric-card" key={item.status}>
                <span>{item.status}</span>
                <strong style={{ color: STATUS_COLOR[item.status] || "var(--ink)" }}>{item.total}</strong>
              </article>
            ))}
          </section>

          <section className="dashboard-grid">
            <article className="panel">
              <div className="panel-header"><h2>Inbound Leads</h2><span className="pill">{leads.length} shown</span></div>
              <div className="table-stack">
                {leads.length ? leads.map(l => (
                  <div className="table-row" key={l.lead_id}>
                    <div><strong>{l.company_name}</strong><span>{l.contact_person}</span></div>
                    <div style={{ textAlign: "right" }}>
                      <span className="status-badge" style={{ "--sc": STATUS_COLOR[l.status] || "#999" }}>{l.status}</span>
                      <span style={{ fontSize: "0.8rem", color: "var(--muted)", display: "block" }}>{l.lead_source}</span>
                    </div>
                  </div>
                )) : <p className="muted">No leads created yet.</p>}
              </div>
            </article>

            <article className="panel">
              <div className="panel-header"><h2>Lead Sources</h2><span className="pill">{sources.length} channels</span></div>
              <div className="table-stack">
                {sources.length ? sources.map(src => {
                  const count = leads.filter(l => l.lead_source === src).length;
                  return (
                    <div className="table-row" key={src}>
                      <strong>{src}</strong>
                      <div className="source-bar-wrap">
                        <div className="source-bar" style={{ "--pct": `${Math.min(100, (count / leads.length) * 100)}%` }} />
                        <span>{count} leads</span>
                      </div>
                    </div>
                  );
                }) : <p className="muted">No source data yet.</p>}
              </div>
            </article>

            <article className="panel" style={{ gridColumn: "1 / -1" }}>
              <div className="panel-header"><h2>My Tasks</h2><span className="pill">{tasks.length} tasks</span></div>
              <div className="table-stack">
                {tasks.length ? tasks.map(t => (
                  <div className="table-row" key={t.task_id}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span className="activity-dot" style={{ background: "#ec4899" }} />
                      <div><strong>{t.title}</strong><span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{t.type}</span></div>
                    </div>
                    <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{new Date(t.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                  </div>
                )) : <p className="muted">No pending tasks.</p>}
              </div>
            </article>
          </section>
        </>
      )}
    </DashboardShell>
  );
}
