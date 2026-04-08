"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";
import DashboardShell from "../../../components/dashboard/DashboardShell";

export default function SupportDashboard() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [summary, setSummary] = useState({});
  const [tasks, setTasks]     = useState([]);
  const [notifs, setNotifs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    const s = loadSession();
    if (!s) { router.replace("/login"); return; }
    if (s.user?.role !== "support") { router.replace("/login"); return; }
    setSession(s);
    Promise.all([
      apiRequest("/dashboard/summary", { token: s.token }),
      apiRequest("/tasks?page_size=8", { token: s.token }),
      apiRequest("/notifications?page_size=5", { token: s.token }),
    ]).then(([sum, tsk, ntf]) => {
      setSummary(sum); setTasks(tsk.items || []); setNotifs(ntf.items || []);
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const pending  = tasks.filter(t => t.status === "pending").length;
  const done     = tasks.filter(t => t.status === "done").length;

  const heroStats = [
    { label: "Open Tickets",  value: pending,  color: "#f5a623" },
    { label: "Resolved",      value: done,     color: "#1fc778" },
    { label: "Notifications", value: notifs.filter(n => !n.is_read).length, color: "#e05252" },
    { label: "Total Tasks",   value: tasks.length },
  ];

  return (
    <DashboardShell session={session} title="Support Dashboard" eyebrow="Support Operations" heroStats={heroStats}>
      {error && <div className="alert error">{error}</div>}
      {loading && <div className="alert">Loading dashboard...</div>}
      {!loading && (
        <section className="dashboard-grid">
          <article className="panel" style={{ gridColumn: "1 / -1" }}>
            <div className="panel-header"><h2>Support Tasks</h2><span className="pill">{tasks.length} tasks</span></div>
            <div className="table-stack">
              {tasks.length ? tasks.map(t => (
                <div className="table-row" key={t.task_id}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span className="activity-dot" style={{ background: t.status === "done" ? "#1fc778" : "#e05252" }} />
                    <div><strong>{t.title}</strong><span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{t.type} · {t.priority}</span></div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span className="status-badge" style={{ "--sc": t.status === "done" ? "#1fc778" : "#f5a623" }}>{t.status}</span>
                    <span style={{ fontSize: "0.8rem", color: "var(--muted)", display: "block" }}>{new Date(t.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                  </div>
                </div>
              )) : <p className="muted">No support tasks assigned.</p>}
            </div>
          </article>

          <article className="panel">
            <div className="panel-header"><h2>Notifications</h2><span className="pill">{notifs.filter(n => !n.is_read).length} unread</span></div>
            <div className="table-stack">
              {notifs.length ? notifs.map(n => (
                <div className="table-row" key={n.notif_id} style={{ opacity: n.is_read ? 0.6 : 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    {!n.is_read && <span className="activity-dot" />}
                    <div><strong>{n.title}</strong><span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{n.message}</span></div>
                  </div>
                </div>
              )) : <p className="muted">No notifications.</p>}
            </div>
          </article>

          <article className="panel">
            <div className="panel-header"><h2>Task Summary</h2></div>
            <div className="table-stack">
              <div className="table-row"><div><strong>Pending</strong><span>Open tickets</span></div><strong style={{ color: "#f5a623" }}>{pending}</strong></div>
              <div className="table-row"><div><strong>Resolved</strong><span>Closed tickets</span></div><strong style={{ color: "#1fc778" }}>{done}</strong></div>
              <div className="table-row"><div><strong>Total</strong><span>All tasks</span></div><strong>{tasks.length}</strong></div>
            </div>
          </article>
        </section>
      )}
    </DashboardShell>
  );
}
