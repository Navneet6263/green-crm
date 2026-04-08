"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../../../components/dashboard/DashboardShell";
import DashboardIcon from "../../../components/dashboard/icons";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";

const STATUS_TONE = {
  new: { bg: "rgba(219, 234, 254, 0.95)", ink: "#2563eb" },
  contacted: { bg: "rgba(224, 242, 254, 0.95)", ink: "#0891b2" },
  qualified: { bg: "rgba(237, 233, 254, 0.95)", ink: "#6d46d6" },
  proposal: { bg: "rgba(255, 247, 237, 0.95)", ink: "#b45309" },
  negotiation: { bg: "rgba(255, 237, 213, 0.95)", ink: "#c46210" },
  "closed-won": { bg: "rgba(220, 252, 231, 0.92)", ink: "#2f855a" },
  "closed-lost": { bg: "rgba(254, 242, 242, 0.95)", ink: "#b4534f" },
};

const ROLE_TONE = {
  manager: { bg: "rgba(224, 242, 254, 0.95)", ink: "#0891b2" },
  sales: { bg: "rgba(220, 252, 231, 0.92)", ink: "#2f855a" },
  marketing: { bg: "rgba(252, 231, 243, 0.95)", ink: "#be185d" },
  support: { bg: "rgba(254, 242, 242, 0.95)", ink: "#b4534f" },
  "legal-team": { bg: "rgba(255, 247, 237, 0.95)", ink: "#b45309" },
  "finance-team": { bg: "rgba(254, 243, 199, 0.95)", ink: "#b7791f" },
};

const FALLBACK_TONE = { bg: "rgba(241, 245, 249, 0.95)", ink: "#526176" };

function badgeStyle(tone) {
  return {
    "--ops-badge-bg": tone.bg,
    "--ops-badge-ink": tone.ink,
  };
}

function titleize(value = "") {
  return String(value)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(value) {
  return `INR ${Number(value || 0).toLocaleString("en-IN")}`;
}

function initials(value = "NA") {
  return String(value)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "NA";
}

export default function ManagerDashboard() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [summary, setSummary] = useState({});
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/login");
      return;
    }

    if (s.user?.role !== "manager") {
      router.replace("/login");
      return;
    }

    setSession(s);

    Promise.all([
      apiRequest("/dashboard/summary", { token: s.token }),
      apiRequest("/leads?page_size=6", { token: s.token }),
      apiRequest("/users?page_size=6", { token: s.token }),
      apiRequest("/tasks?page_size=5", { token: s.token }),
    ])
      .then(([sum, lds, usr, tsk]) => {
        setSummary(sum || {});
        setLeads(lds.items || []);
        setUsers(usr.items || []);
        setTasks(tsk.items || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [router]);

  const leadCounts = summary.lead_counts || [];
  const totalLeads = leadCounts.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const activePipeline = leadCounts
    .filter((item) => ["contacted", "qualified", "proposal", "negotiation"].includes(item.status))
    .reduce((sum, item) => sum + Number(item.total || 0), 0);
  const recentLeads = summary.recent_leads?.length ? summary.recent_leads : leads;
  const statusMix = useMemo(
    () => [...leadCounts].sort((a, b) => Number(b.total || 0) - Number(a.total || 0)).slice(0, 4),
    [leadCounts]
  );

  const heroStats = [
    { label: "Team Leads", value: totalLeads },
    { label: "Team Size", value: summary.team_size || 0 },
    { label: "Follow-ups", value: summary.pending_reminders || 0, color: "#f5a623" },
    { label: "Overdue Tasks", value: summary.overdue_tasks || 0, color: "#e05252" },
  ];

  return (
    <DashboardShell
      session={session}
      title="Manager Dashboard"
      eyebrow="Team Workspace"
      heroStats={heroStats}
    >
      {error ? <div className="alert error">{error}</div> : null}
      {loading ? <div className="alert">Loading dashboard...</div> : null}

      {!loading ? (
        <section className="ops-shell">
          <article className="ops-overview">
            <div className="ops-overview-head">
              <div className="ops-overview-copy">
                <span className="ops-kicker">Team Control</span>
                <h2>Manager dashboard tuned for lead visibility, team coverage, and task follow-through.</h2>
                <p>
                  This keeps the current manager flow intact while making lead rows, team cards, and workload signals
                  easier on the eye and faster to scan.
                </p>
              </div>

              <div className="ops-action-row">
                <Link href="/leads" className="button primary">
                  <DashboardIcon name="leads" />
                  Lead Workspace
                </Link>
                <Link href="/tasks" className="button ghost">
                  <DashboardIcon name="tasks" />
                  Tasks
                </Link>
                <Link href="/performance" className="button ghost">
                  <DashboardIcon name="performance" />
                  Performance
                </Link>
              </div>
            </div>

            <div className="ops-summary-grid">
              <div className="ops-summary-card">
                <span>Active Pipeline</span>
                <strong>{activePipeline}</strong>
                <p>Leads already in active motion beyond the new stage.</p>
              </div>
              <div className="ops-summary-card">
                <span>Team Capacity</span>
                <strong>{summary.team_size || 0}</strong>
                <p>Total active teammates counted in the company summary.</p>
              </div>
              <div className="ops-summary-card">
                <span>Visible Team Cards</span>
                <strong>{users.length}</strong>
                <p>Recent team members loaded into the manager snapshot grid.</p>
              </div>
              <div className="ops-summary-card">
                <span>Follow-up Load</span>
                <strong>{summary.pending_reminders || 0}</strong>
                <p>Leads carrying upcoming follow-up dates across the team scope.</p>
              </div>
            </div>
          </article>

          <section className="ops-split-grid">
            <article className="panel ops-panel">
              <div className="ops-panel-header">
                <div>
                  <span className="ops-kicker">Lead Watchlist</span>
                  <h3>Recent team leads</h3>
                  <p>The lead surface stays first, with compact cards closer to the full lead workspace style.</p>
                </div>
                <Link href="/leads" className="ops-link">
                  Open all leads
                </Link>
              </div>

              {recentLeads.length ? (
                <div className="ops-lead-list">
                  {recentLeads.map((lead) => {
                    const tone = STATUS_TONE[lead.status] || FALLBACK_TONE;

                    return (
                      <div className="ops-lead-card" key={lead.lead_id}>
                        <div className="ops-lead-top">
                          <div className="ops-identity">
                            <span className="ops-avatar small">{initials(lead.company_name)}</span>
                            <div className="ops-lead-copy">
                              <h4>{lead.company_name || "Unnamed lead"}</h4>
                              <p>{lead.contact_person || "No contact name available"}</p>
                            </div>
                          </div>

                          <div className="ops-chip-row">
                            <span className="ops-badge" style={badgeStyle(tone)}>
                              {titleize(lead.status || "new")}
                            </span>
                            {lead.priority ? <span className="ops-tag">{titleize(lead.priority)}</span> : null}
                          </div>
                        </div>

                        <div className="ops-lead-meta">
                          <div>
                            <span>Value</span>
                            <strong>{formatMoney(lead.estimated_value)}</strong>
                          </div>
                          <div>
                            <span>Workflow</span>
                            <strong>{titleize(lead.workflow_stage || "sales")}</strong>
                          </div>
                          <div>
                            <span>Created</span>
                            <strong>{formatDate(lead.created_at)}</strong>
                          </div>
                        </div>

                        <div className="ops-link-row">
                          <Link href={`/leads/${lead.lead_id}`} className="ops-link">
                            Open detail
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="ops-empty">
                  <DashboardIcon name="leads" />
                  <h4>No team leads loaded</h4>
                  <p>Recent lead cards will appear here once the manager scope receives visible pipeline activity.</p>
                </div>
              )}
            </article>

            <article className="panel ops-panel">
              <div className="ops-panel-header">
                <div>
                  <span className="ops-kicker">Team Grid</span>
                  <h3>People snapshot</h3>
                  <p>Smaller member cards make it easier to scan role balance without a dense table.</p>
                </div>
                <span className="ops-tag">{users.length} shown</span>
              </div>

              {users.length ? (
                <div className="ops-user-grid">
                  {users.map((user) => {
                    const tone = ROLE_TONE[user.role] || FALLBACK_TONE;

                    return (
                      <div className="ops-user-card" key={user.user_id}>
                        <div className="ops-user-meta">
                          <div className="ops-identity">
                            <span className="ops-avatar small">{initials(user.name)}</span>
                            <div className="ops-user-copy">
                              <strong>{user.name || "Unknown user"}</strong>
                              <small>{user.email || "No email available"}</small>
                              <p>{user.talent_id || "Team member"}</p>
                            </div>
                          </div>

                          <span className="ops-badge" style={badgeStyle(tone)}>
                            {titleize(user.role || "user")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="ops-empty">
                  <DashboardIcon name="users" />
                  <h4>No team members loaded</h4>
                  <p>Team cards will appear here once the visible manager roster is available.</p>
                </div>
              )}
            </article>
          </section>

          <section className="ops-split-grid">
            <article className="panel ops-panel">
              <div className="ops-panel-header">
                <div>
                  <span className="ops-kicker">Pipeline Mix</span>
                  <h3>Status coverage</h3>
                  <p>Quick status distribution for the manager to spot where pressure is building.</p>
                </div>
                <Link href="/analytics" className="ops-link">
                  Open analytics
                </Link>
              </div>

              {statusMix.length ? (
                <div className="ops-stage-grid">
                  {statusMix.map((item) => {
                    const tone = STATUS_TONE[item.status] || FALLBACK_TONE;

                    return (
                      <div className="ops-stage-card" key={item.status}>
                        <span className="ops-badge" style={badgeStyle(tone)}>
                          {titleize(item.status)}
                        </span>
                        <strong>{Number(item.total || 0)}</strong>
                        <p>{Number(item.total || 0)} leads currently sit in this visible status bucket.</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="ops-empty">
                  <DashboardIcon name="analytics" />
                  <h4>No status data yet</h4>
                  <p>Status distribution will render here once the team pipeline has enough activity.</p>
                </div>
              )}
            </article>

            <article className="panel ops-panel">
              <div className="ops-panel-header">
                <div>
                  <span className="ops-kicker">Task Queue</span>
                  <h3>Pending follow-through</h3>
                  <p>Compact task rows keep due work visible without oversized controls.</p>
                </div>
                <Link href="/tasks" className="ops-link">
                  Open tasks
                </Link>
              </div>

              {tasks.length ? (
                <div className="ops-mini-list">
                  {tasks.map((task) => (
                    <div className="ops-mini-row" key={task.task_id}>
                      <div>
                        <strong>{task.title || "Untitled task"}</strong>
                        <p>{titleize(task.type || "task")}</p>
                      </div>
                      <span className="ops-inline-value">{formatDate(task.due_date)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ops-empty">
                  <DashboardIcon name="tasks" />
                  <h4>No pending tasks</h4>
                  <p>The manager task list will show due work here once tasks are assigned to the team.</p>
                </div>
              )}
            </article>
          </section>
        </section>
      ) : null}
    </DashboardShell>
  );
}
