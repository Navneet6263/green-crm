"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../../../components/dashboard/DashboardShell";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";

const money = (value) => `INR ${Number(value || 0).toLocaleString("en-IN")}`;
const when = (value) => !value ? "--" : new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export default function LegalDashboard() {
  const router = useRouter();
  const [session, setSession] = useState(null), [queue, setQueue] = useState([]), [history, setHistory] = useState([]), [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");

  useEffect(() => {
    const activeSession = loadSession();
    if (!activeSession) return router.replace("/login");
    if (activeSession.user?.role !== "legal-team") return router.replace("/login");
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
    { label: "Legal Queue", value: queue.length },
    { label: "Pending Review", value: queue.filter((lead) => lead.agreement_status === "pending").length, color: "#b96a00" },
    { label: "Docs Uploaded", value: queue.reduce((sum, lead) => sum + Number(lead.legal_doc_count || lead.doc_count || 0), 0), color: "#0f8c53" },
    { label: "Queue Value", value: money(queue.reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0)), color: "#0f8c53" },
  ], [queue]);

  return (
    <DashboardShell session={session} title="Legal Dashboard" eyebrow="Legal Stage" heroStats={heroStats}>
      {error ? <div className="alert error">{error}</div> : null}
      {loading ? <div className="alert">Loading legal dashboard...</div> : null}
      {!loading ? (
        <section className="dashboard-grid">
          <article className="panel" style={{ gridColumn: "1 / -1" }}>
            <div className="panel-header"><div><span className="lead-kicker">Queue</span><h2>What needs review now</h2></div><div className="workflow-action-links"><Link href="/workflow/legal" className="button primary">Open Legal Queue</Link><Link href="/documents" className="button ghost">Documents</Link></div></div>
            <div className="table-stack">
              {queue.length ? queue.map((lead) => (
                <div className="table-row" key={lead.lead_id}>
                  <div><strong>{lead.company_name}</strong><span>{lead.contact_person} | {money(lead.estimated_value)}</span></div>
                  <div style={{ textAlign: "right" }}><strong>{lead.agreement_status || "pending"}</strong><span style={{ display: "block", fontSize: "0.82rem", color: "var(--muted)" }}>{lead.doc_count || 0} docs | {lead.legal_owner_name || "Unassigned"}</span></div>
                </div>
              )) : <p className="muted">No leads are waiting in legal right now.</p>}
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
            <div className="panel-header"><h2>Recent Hand-offs</h2><span className="pill">{history.length}</span></div>
            <div className="table-stack">
              {history.length ? history.map((item) => (
                <div className="table-row" key={`${item.lead_id}-${item.transferred_at}`}>
                  <div><strong>{item.company_name}</strong><span>{item.from_stage} to {item.to_stage}</span></div>
                  <strong>{when(item.transferred_at)}</strong>
                </div>
              )) : <p className="muted">No recent transfer history.</p>}
            </div>
          </article>
        </section>
      ) : null}
    </DashboardShell>
  );
}
