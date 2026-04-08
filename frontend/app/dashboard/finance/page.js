"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../../../components/dashboard/DashboardShell";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";

const money = (value) => `INR ${Number(value || 0).toLocaleString("en-IN")}`;
const when = (value) => !value ? "--" : new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export default function FinanceDashboard() {
  const router = useRouter();
  const [session, setSession] = useState(null), [queue, setQueue] = useState([]), [history, setHistory] = useState([]), [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");

  useEffect(() => {
    const activeSession = loadSession();
    if (!activeSession) return router.replace("/login");
    if (activeSession.user?.role !== "finance-team") return router.replace("/login");
    setSession(activeSession);
    Promise.all([
      apiRequest("/workflow/my-assigned?page_size=10", { token: activeSession.token }),
      apiRequest("/workflow/my-history?page_size=6", { token: activeSession.token }),
      apiRequest("/tasks?page_size=6", { token: activeSession.token }),
    ]).then(([queueResponse, historyResponse, tasksResponse]) => {
      setQueue(queueResponse.items || []);
      setHistory(historyResponse.items || []);
      setTasks(tasksResponse.items || []);
    }).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false));
  }, [router]);

  const heroStats = useMemo(() => [
    { label: "Finance Queue", value: queue.length },
    { label: "With Invoice", value: queue.filter((lead) => lead.invoice_number).length, color: "#0f8c53" },
    { label: "Pending Invoice", value: queue.filter((lead) => !lead.invoice_number).length, color: "#b96a00" },
    { label: "Queue Value", value: money(queue.reduce((sum, lead) => sum + Number(lead.invoice_amount || lead.estimated_value || 0), 0)), color: "#0f8c53" },
  ], [queue]);

  return (
    <DashboardShell session={session} title="Finance Dashboard" eyebrow="Finance Stage" heroStats={heroStats}>
      {error ? <div className="alert error">{error}</div> : null}
      {loading ? <div className="alert">Loading finance dashboard...</div> : null}
      {!loading ? (
        <section className="dashboard-grid">
          <article className="panel" style={{ gridColumn: "1 / -1" }}>
            <div className="panel-header"><div><span className="lead-kicker">Queue</span><h2>What is ready to close</h2></div><div className="workflow-action-links"><Link href="/workflow/finance" className="button primary">Open Finance Queue</Link><Link href="/documents" className="button ghost">Documents</Link></div></div>
            <div className="table-stack">
              {queue.length ? queue.map((lead) => (
                <div className="table-row" key={lead.lead_id}>
                  <div><strong>{lead.company_name}</strong><span>{lead.contact_person} | {money(lead.invoice_amount || lead.estimated_value)}</span></div>
                  <div style={{ textAlign: "right" }}><strong>{lead.invoice_number || "No invoice"}</strong><span style={{ display: "block", fontSize: "0.82rem", color: "var(--muted)" }}>{lead.doc_count || 0} docs | {lead.finance_owner_name || "Unassigned"}</span></div>
                </div>
              )) : <p className="muted">No leads are waiting in finance right now.</p>}
            </div>
          </article>

          <article className="panel">
            <div className="panel-header"><h2>My Tasks</h2><span className="pill">{tasks.length}</span></div>
            <div className="table-stack">
              {tasks.length ? tasks.map((task) => (
                <div className="table-row" key={task.task_id}>
                  <div><strong>{task.title}</strong><span>{task.type}</span></div>
                  <strong>{when(task.due_date)}</strong>
                </div>
              )) : <p className="muted">No pending tasks.</p>}
            </div>
          </article>

          <article className="panel">
            <div className="panel-header"><h2>Recent Closures</h2><span className="pill">{history.length}</span></div>
            <div className="table-stack">
              {history.length ? history.map((item) => (
                <div className="table-row" key={`${item.lead_id}-${item.transferred_at}`}>
                  <div><strong>{item.company_name}</strong><span>{item.from_stage} to {item.to_stage}</span></div>
                  <strong>{when(item.transferred_at)}</strong>
                </div>
              )) : <p className="muted">No recent workflow history.</p>}
            </div>
          </article>
        </section>
      ) : null}
    </DashboardShell>
  );
}
