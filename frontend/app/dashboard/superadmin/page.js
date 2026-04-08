"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../../../components/dashboard/DashboardShell";
import DashboardIcon from "../../../components/dashboard/icons";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";

const COMPANY_STATUS_TONE = {
  active: { bg: "rgba(220, 252, 231, 0.92)", ink: "#2f855a" },
  trial: { bg: "rgba(255, 247, 237, 0.95)", ink: "#b45309" },
  suspended: { bg: "rgba(254, 242, 242, 0.95)", ink: "#b4534f" },
};

const USER_ROLE_TONE = {
  admin: { bg: "rgba(219, 234, 254, 0.95)", ink: "#2563eb" },
  manager: { bg: "rgba(224, 242, 254, 0.95)", ink: "#0891b2" },
  sales: { bg: "rgba(220, 252, 231, 0.92)", ink: "#2f855a" },
  marketing: { bg: "rgba(252, 231, 243, 0.95)", ink: "#be185d" },
  support: { bg: "rgba(254, 242, 242, 0.95)", ink: "#b4534f" },
  "legal-team": { bg: "rgba(255, 247, 237, 0.95)", ink: "#b45309" },
  "finance-team": { bg: "rgba(254, 243, 199, 0.95)", ink: "#b7791f" },
};

const WORKFLOW_TONE = {
  sales: { bg: "rgba(219, 234, 254, 0.95)", ink: "#2563eb" },
  legal: { bg: "rgba(255, 247, 237, 0.95)", ink: "#b45309" },
  finance: { bg: "rgba(254, 243, 199, 0.95)", ink: "#b7791f" },
  completed: { bg: "rgba(220, 252, 231, 0.92)", ink: "#2f855a" },
};

const FALLBACK_TONE = { bg: "rgba(241, 245, 249, 0.95)", ink: "#526176" };

function badgeStyle(tone) {
  return {
    "--ops-badge-bg": tone.bg,
    "--ops-badge-ink": tone.ink,
  };
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

function titleize(value = "") {
  return String(value)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function initials(value = "NA") {
  return String(value)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "NA";
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [summary, setSummary] = useState({});
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/login");
      return;
    }

    if (s.user?.role !== "super-admin") {
      router.replace("/login");
      return;
    }

    setSession(s);

    Promise.all([
      apiRequest("/dashboard/summary", { token: s.token }),
      apiRequest("/companies?page_size=8", { token: s.token }),
      apiRequest("/users?page_size=8", { token: s.token }),
      apiRequest("/leads?page_size=6", { token: s.token }),
    ])
      .then(([sum, comp, usr, lds]) => {
        setSummary(sum || {});
        setCompanies(comp.items || []);
        setUsers(usr.items || []);
        setLeads(lds.items || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [router]);

  const heroStats = [
    { label: "Companies", value: summary.companies || 0 },
    { label: "Total Users", value: summary.users || 0 },
    { label: "All Leads", value: summary.leads || 0 },
    { label: "Products", value: summary.products || 0 },
  ];

  const companyWindow = useMemo(
    () => (companies.length ? companies : summary.recent_companies || []),
    [companies, summary.recent_companies]
  );

  const visibleHealth = useMemo(
    () => ({
      active: companyWindow.filter((item) => item.status === "active").length,
      trial: companyWindow.filter((item) => item.status === "trial").length,
      suspended: companyWindow.filter((item) => item.status === "suspended").length,
    }),
    [companyWindow]
  );

  const visibleUserCount = users.filter((item) => item.is_active !== false).length;
  const visibleLeadValue = leads.reduce(
    (total, item) => total + Number(item.estimated_value || 0),
    0
  );

  return (
    <DashboardShell
      session={session}
      title="Super Admin Dashboard"
      eyebrow="Platform Overview"
      heroStats={heroStats}
    >
      {error ? <div className="alert error">{error}</div> : null}
      {loading ? <div className="alert">Loading platform data...</div> : null}

      {!loading ? (
        <section className="ops-shell">
          <article className="ops-overview">
            <div className="ops-overview-head">
              <div className="ops-action-row">
                <Link href="/super-admin/companies" className="button primary">
                  <DashboardIcon name="company" />
                  Companies
                </Link>
                <Link href="/super-admin/users" className="button ghost">
                  <DashboardIcon name="users" />
                  Platform Users
                </Link>
                <Link href="/super-admin/demo-requests" className="button ghost">
                  <DashboardIcon name="demo" />
                  Demo Requests
                </Link>
              </div>
            </div>

            <div className="ops-summary-grid">
              <div className="ops-summary-card">
                <span>Shown</span>
                <strong>{companyWindow.length}</strong>
              </div>

              <div className="ops-summary-card">
                <span>Users</span>
                <strong>{visibleUserCount}</strong>
              </div>

              <div className="ops-summary-card">
                <span>Lead Value</span>
                <strong>{formatMoney(visibleLeadValue)}</strong>
              </div>

              <div className="ops-summary-card">
                <span>Latest</span>
                <strong>{companyWindow[0]?.name || "No tenants yet"}</strong>
                <small>{companyWindow[0]?.created_at ? formatDate(companyWindow[0].created_at) : "No activity"}</small>
              </div>
            </div>
          </article>

          <section className="ops-split-grid">
            <article className="panel ops-panel">
              <div className="ops-panel-header">
                <div>
                  <h3>Companies</h3>
                </div>
              </div>

              {companyWindow.length ? (
                <div className="ops-company-grid">
                  {companyWindow.map((company) => {
                    const tone = COMPANY_STATUS_TONE[company.status] || FALLBACK_TONE;

                    return (
                      <div className="ops-company-card" key={company.company_id}>
                        <div className="ops-company-top">
                          <div className="ops-identity">
                            <span className="ops-avatar">{initials(company.name)}</span>
                            <div className="ops-company-copy">
                              <strong>{company.name}</strong>
                              <small>{company.slug || "Tenant account"}</small>
                            </div>
                          </div>
                          <span className="ops-badge" style={badgeStyle(tone)}>
                            {titleize(company.status || "active")}
                          </span>
                        </div>

                        <div className="ops-link-row">
                          <span className="ops-tag">Created {formatDate(company.created_at)}</span>
                          <Link href="/super-admin/companies" className="ops-link">
                            Manage companies
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="ops-empty">
                  <DashboardIcon name="company" />
                  <h4>No companies yet</h4>
                </div>
              )}
            </article>

            <div className="ops-stack">
              <article className="panel ops-panel">
                <div className="ops-panel-header">
                  <div>
                    <h3>Health</h3>
                  </div>
                </div>

                <div className="ops-mini-list">
                  <div className="ops-stat-line">
                    <div>
                      <strong>Active tenants</strong>
                    </div>
                    <span className="ops-inline-value">{visibleHealth.active}</span>
                  </div>
                  <div className="ops-stat-line">
                    <div>
                      <strong>Trial tenants</strong>
                    </div>
                    <span className="ops-inline-value">{visibleHealth.trial}</span>
                  </div>
                  <div className="ops-stat-line">
                    <div>
                      <strong>Suspended tenants</strong>
                    </div>
                    <span className="ops-inline-value">{visibleHealth.suspended}</span>
                  </div>
                  <div className="ops-stat-line">
                    <div>
                      <strong>Total platform reach</strong>
                    </div>
                    <span className="ops-inline-value">{summary.companies || 0}</span>
                  </div>
                </div>
              </article>

              <article className="panel ops-panel">
                <div className="ops-panel-header">
                <div>
                  <h3>Links</h3>
                </div>
                </div>

                <div className="ops-mini-list">
                  <div className="ops-mini-row">
                    <div>
                      <strong>Company governance</strong>
                    </div>
                    <Link href="/super-admin/companies" className="ops-link">
                      Open
                    </Link>
                  </div>
                  <div className="ops-mini-row">
                    <div>
                      <strong>User control</strong>
                    </div>
                    <Link href="/super-admin/users" className="ops-link">
                      Open
                    </Link>
                  </div>
                  <div className="ops-mini-row">
                    <div>
                      <strong>Security and audit</strong>
                    </div>
                    <Link href="/super-admin/security" className="ops-link">
                      Open
                    </Link>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section className="ops-split-grid">
            <article className="panel ops-panel">
              <div className="ops-panel-header">
                <div>
                  <h3>Recent leads</h3>
                </div>
                <Link href="/leads" className="ops-link">
                  Open lead workspace
                </Link>
              </div>

              {leads.length ? (
                <div className="ops-lead-list">
                  {leads.map((lead) => {
                    const tone = WORKFLOW_TONE[lead.workflow_stage] || FALLBACK_TONE;

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
                              {titleize(lead.workflow_stage || "sales")}
                            </span>
                          </div>
                        </div>

                        <div className="ops-lead-meta">
                          <div>
                            <span>Value</span>
                            <strong>{formatMoney(lead.estimated_value)}</strong>
                          </div>
                          <div>
                            <span>Created</span>
                            <strong>{formatDate(lead.created_at)}</strong>
                          </div>
                          <div>
                            <span>Contact</span>
                            <strong>{lead.contact_person || "Not added"}</strong>
                          </div>
                        </div>

                        <div className="ops-link-row">
                          <Link href={`/leads/${lead.lead_id}`} className="ops-link">
                            Open lead
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="ops-empty">
                  <DashboardIcon name="leads" />
                  <h4>No lead activity yet</h4>
                </div>
              )}
            </article>

            <article className="panel ops-panel">
              <div className="ops-panel-header">
                <div>
                  <h3>Users</h3>
                </div>
              </div>

              {users.length ? (
                <div className="ops-user-grid">
                  {users.map((user) => {
                    const tone = USER_ROLE_TONE[user.role] || FALLBACK_TONE;

                    return (
                      <div className="ops-user-card" key={user.user_id}>
                        <div className="ops-user-meta">
                          <div className="ops-identity">
                            <span className="ops-avatar small">{initials(user.name)}</span>
                            <div className="ops-user-copy">
                              <strong>{user.name || "Unknown user"}</strong>
                              <small>{user.email || "No email available"}</small>
                            </div>
                          </div>

                          <span className="ops-badge" style={badgeStyle(tone)}>
                            {titleize(user.role || "user")}
                          </span>
                        </div>

                        <div className="ops-link-row">
                          <span
                            className="ops-tag"
                            style={
                              user.is_active === false
                                ? badgeStyle({ bg: "rgba(254, 242, 242, 0.95)", ink: "#b4534f" })
                                : badgeStyle({ bg: "rgba(220, 252, 231, 0.92)", ink: "#2f855a" })
                            }
                          >
                            {user.is_active === false ? "Inactive" : "Active"}
                          </span>
                          <Link href="/super-admin/users" className="ops-link">
                            Manage users
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="ops-empty">
                  <DashboardIcon name="users" />
                  <h4>No users loaded</h4>
                </div>
              )}
            </article>
          </section>
        </section>
      ) : null}
    </DashboardShell>
  );
}
