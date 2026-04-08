"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";
import DashboardShell from "../../../components/dashboard/DashboardShell";

const STATUS_COLOR = { new: "#4a9eff", contacted: "#38bdf8", qualified: "#a78bfa", proposal: "#f5a623", negotiation: "#fb923c", "closed-won": "#1fc778", "closed-lost": "#e05252" };

export default function SalesDashboard() {
  const router = useRouter();
  const [session, setSession]     = useState(null);
  const [summary, setSummary]     = useState({});
  const [leads, setLeads]         = useState([]);
  const [tasks, setTasks]         = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  useEffect(() => {
    const s = loadSession();
    if (!s) { router.replace("/login"); return; }
    if (s.user?.role !== "sales") { router.replace("/login"); return; }
    setSession(s);
    Promise.all([
      apiRequest("/dashboard/summary", { token: s.token }),
      apiRequest("/leads?page_size=6", { token: s.token }),
      apiRequest("/tasks?page_size=5", { token: s.token }),
      apiRequest("/leads/reminders?page_size=5", { token: s.token }),
    ]).then(([sum, lds, tsk, rem]) => {
      setSummary(sum); setLeads(lds.items || []); setTasks(tsk.items || []); setReminders(rem.items || []);
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const totalLeads = (summary.lead_counts || []).reduce((s, i) => s + Number(i.total), 0);
  const wonLeads   = (summary.lead_counts || []).find(i => i.status === "closed-won")?.total || 0;

  const heroStats = [
    { label: "My Pipeline",   value: totalLeads },
    { label: "Closed Won",    value: wonLeads,                  color: "#1fc778" },
    { label: "Follow-ups",    value: summary.pending_reminders, color: "#f5a623" },
    { label: "Tasks Due",     value: tasks.length,              color: "#fb923c" },
  ];

  return (
    <DashboardShell session={session} title="Sales Dashboard" eyebrow="My Pipeline" heroStats={heroStats}>
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
              <div className="panel-header"><h2>My Created Leads</h2><span className="pill">{leads.length} shown</span></div>
              <div className="table-stack">
                {leads.length ? leads.map(l => (
                  <div className="table-row" key={l.lead_id}>
                    <div><strong>{l.company_name}</strong><span>{l.contact_person}</span></div>
                    <div style={{ textAlign: "right" }}>
                      <span className="status-badge" style={{ "--sc": STATUS_COLOR[l.status] || "#999" }}>{l.status}</span>
                      <span style={{ fontSize: "0.8rem", color: "var(--muted)", display: "block" }}>₹{Number(l.estimated_value || 0).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                )) : <p className="muted">No leads created yet.</p>}
              </div>
            </article>

            <article className="panel">
              <div className="panel-header"><h2>Follow-up Queue</h2><span className="pill">{reminders.length} queued</span></div>
              <div className="table-stack">
                {reminders.length ? reminders.map(r => (
                  <div className="table-row" key={r.reminder_id}>
                    <div><strong>{r.company_name}</strong><span>{r.contact_person_name}</span></div>
                    <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{new Date(r.due_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                )) : <p className="muted">No follow-ups pending. Great work!</p>}
              </div>
            </article>

            <article className="panel" style={{ gridColumn: "1 / -1" }}>
              <div className="panel-header"><h2>My Tasks</h2><span className="pill">{tasks.length} tasks</span></div>
              <div className="table-stack">
                {tasks.length ? tasks.map(t => (
                  <div className="table-row" key={t.task_id}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span className="activity-dot" />
                      <div><strong>{t.title}</strong><span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{t.type}</span></div>
                    </div>
                    <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{new Date(t.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                  </div>
                )) : <p className="muted">No tasks pending.</p>}
              </div>
            </article>
          </section>
        </>
      )}
    </DashboardShell>
  );
}
