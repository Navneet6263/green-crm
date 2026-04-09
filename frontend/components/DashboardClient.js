"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "../lib/api";
import { clearSession, loadSession } from "../lib/session";

const PLATFORM_CONSOLE_ROLES = ["super-admin", "platform-admin", "platform-manager"];

const EMPTY_DASHBOARD_DATA = {
  summary: {},
  leads: [],
  products: [],
  reminders: [],
  users: [],
  companies: [],
};

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function getLeadTotals(leadCounts = []) {
  return leadCounts.reduce((sum, item) => sum + Number(item.total || 0), 0);
}

function formatRoleLabel(role = "") {
  return String(role)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildCards(role, summary) {
  if (role === "super-admin") {
    return [
      { label: "Companies", value: summary.companies },
      { label: "Users", value: summary.users },
      { label: "Leads", value: summary.leads },
      { label: "Products", value: summary.products },
    ];
  }

  if (role === "admin" || role === "manager") {
    return [
      { label: "Team Size", value: summary.team_size },
      { label: "Open Leads", value: getLeadTotals(summary.lead_counts) },
      { label: "Pending Follow-ups", value: summary.pending_reminders },
      { label: "Active Sources", value: (summary.source_mix || []).length },
    ];
  }

  return [
    { label: role === "marketing" ? "Created Leads" : "My Pipeline", value: getLeadTotals(summary.lead_counts) },
    { label: "Pending Follow-ups", value: summary.pending_reminders },
    {
      label: "Won Deals",
      value: (summary.lead_counts || []).find((item) => item.status === "WON")?.total || 0,
    },
    { label: "Recent Touchpoints", value: (summary.recent_activity || []).length },
  ];
}

export default function DashboardClient() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [data, setData] = useState(EMPTY_DASHBOARD_DATA);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const savedSession = loadSession();

    if (!savedSession?.token || !savedSession?.user?.role) {
      clearSession();
      setSession(null);
      setLoading(false);
      setBootstrapping(false);
      router.replace("/login");
      return;
    }

    if (PLATFORM_CONSOLE_ROLES.includes(savedSession.user.role)) {
      setBootstrapping(false);
      router.replace("/super-admin");
      return;
    }

    setSession(savedSession);
    setBootstrapping(false);
  }, [router]);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;

    async function fetchDashboard() {
      setLoading(true);
      setError("");

      try {
        const [summary, leads, products, reminders, users, companies] = await Promise.all([
          apiRequest("/dashboard/summary", { token: session.token }),
          apiRequest("/leads?page_size=5", { token: session.token }),
          apiRequest("/products?page_size=5", { token: session.token }),
          apiRequest("/leads/reminders?page_size=5", { token: session.token }),
          ["super-admin", "admin", "manager"].includes(session.user.role)
            ? apiRequest("/users?page_size=5", { token: session.token })
            : Promise.resolve({ items: [], meta: {} }),
          session.user.role === "super-admin"
            ? apiRequest("/companies?page_size=5", { token: session.token })
            : Promise.resolve({ items: [], meta: {} }),
        ]);

        if (!cancelled) {
          setData({
            summary,
            leads: leads.items || [],
            products: products.items || [],
            reminders: reminders.items || [],
            users: users.items || [],
            companies: companies.items || [],
          });
        }
      } catch (requestError) {
        if (!cancelled) {
          const message = requestError.message || "Failed to load dashboard.";
          if (/401|403/i.test(String(message))) {
            clearSession();
            router.replace("/login");
          }
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchDashboard();

    return () => {
      cancelled = true;
    };
  }, [router, session]);

  if (bootstrapping || !session) {
    return (
      <div className="dashboard-shell">
        <section className="dashboard-hero">
          <div>
            <span className="eyebrow">Redirecting</span>
            <h1>Dashboard</h1>
            <p>Checking your session and opening the correct workspace.</p>
          </div>
        </section>

        {error ? <div className="alert error">{error}</div> : <div className="alert">Redirecting to login...</div>}
      </div>
    );
  }

  const role = session.user.role;
  const cards = buildCards(role, data.summary || {});
  const leads = data.leads?.length ? data.leads : data.summary?.recent_leads || [];
  const products = data.products?.length ? data.products : data.summary?.recent_products || [];
  const reminders = data.reminders || [];
  const users = data.users || [];
  const companies = data.companies || data.summary?.recent_companies || [];

  return (
    <div className="dashboard-shell">
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">Live workspace</span>
          <h1>{formatRoleLabel(role)} Dashboard</h1>
          <p>{`${session.user.full_name} | ${session.company?.name || "Tenant workspace"}`}</p>
        </div>

        <div className="dashboard-actions">
          <span className="pill">{session.user.talent_id}</span>
          <button
            className="button ghost"
            onClick={() => {
              clearSession();
              setSession(null);
              setData(EMPTY_DASHBOARD_DATA);
              router.replace("/login");
            }}
          >
            Logout
          </button>
        </div>
      </section>

      {error ? <div className="alert error">{error}</div> : null}
      {loading ? <div className="alert">Loading dashboard data...</div> : null}

      <section className="card-grid">
        {cards.map((card) => (
          <article className="metric-card" key={card.label}>
            <span>{card.label}</span>
            <strong>{formatNumber(card.value)}</strong>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-header">
            <h2>Recent Leads</h2>
            <span className="pill">{leads.length} shown</span>
          </div>
          <div className="table-stack">
            {leads.length ? (
              leads.map((lead) => (
                <div className="table-row" key={lead.lead_id}>
                  <div>
                    <strong>{lead.company_name}</strong>
                    <span>{lead.contact_person_name}</span>
                  </div>
                  <div>
                    <span>{lead.status}</span>
                    <span>{lead.priority}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted">No leads available for this view yet.</p>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>Follow-up Queue</h2>
            <span className="pill">{reminders.length} queued</span>
          </div>
          <div className="table-stack">
            {reminders.length ? (
              reminders.map((reminder) => (
                <div className="table-row" key={reminder.reminder_id}>
                  <div>
                    <strong>{reminder.company_name}</strong>
                    <span>{reminder.contact_person_name}</span>
                  </div>
                  <div>
                    <span>{new Date(reminder.due_at).toLocaleString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted">No pending reminders right now.</p>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>Recent Products</h2>
            <span className="pill">{products.length} active</span>
          </div>
          <div className="table-stack">
            {products.length ? (
              products.map((product) => (
                <div className="table-row" key={product.product_id}>
                  <div>
                    <strong>{product.name}</strong>
                    <span>{product.category || "General"}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted">Products appear here after super admins publish and tenants enable them.</p>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>{role === "super-admin" ? "Recent Companies" : "Team Directory"}</h2>
            <span className="pill">{role === "super-admin" ? companies.length : users.length}</span>
          </div>
          <div className="table-stack">
            {role === "super-admin"
              ? companies.map((company) => (
                  <div className="table-row" key={company.company_id}>
                    <div>
                      <strong>{company.name}</strong>
                      <span>{company.plan_name}</span>
                    </div>
                    <div>
                      <span>{company.status}</span>
                    </div>
                  </div>
                ))
              : users.map((user) => (
                  <div className="table-row" key={user.user_id}>
                    <div>
                      <strong>{user.full_name}</strong>
                      <span>{user.talent_id}</span>
                    </div>
                    <div>
                      <span>{user.role}</span>
                    </div>
                  </div>
                ))}

            {role === "super-admin" && !companies.length ? (
              <p className="muted">New tenants will appear here as companies onboard.</p>
            ) : null}
            {role !== "super-admin" && !users.length ? (
              <p className="muted">Invite managers, sales, marketing, and support users to populate this view.</p>
            ) : null}
          </div>
        </article>
      </section>
    </div>
  );
}
