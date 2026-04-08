"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "../lib/api";
import { clearSession, loadSession } from "../lib/session";

const ROLE_OPTIONS = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "SALES",
  "MARKETING",
  "SUPPORT",
];

const PREVIEW_DATA = {
  SUPER_ADMIN: {
    summary: {
      companies: 42,
      users: 1860,
      leads: 12840,
      products: 18,
      recent_companies: [
        { company_id: "cmp_demo_1", name: "Northbeam Tech", status: "ACTIVE", plan_name: "enterprise" },
        { company_id: "cmp_demo_2", name: "Atlas Foods", status: "TRIAL", plan_name: "growth" },
      ],
    },
    leads: [],
    products: [],
    reminders: [],
    users: [],
  },
  ADMIN: {
    summary: {
      team_size: 36,
      pending_reminders: 21,
      lead_counts: [
        { status: "NEW", total: 18 },
        { status: "QUALIFIED", total: 25 },
        { status: "PROPOSAL", total: 9 },
        { status: "WON", total: 7 },
      ],
      source_mix: [
        { lead_source: "LinkedIn", total: 22 },
        { lead_source: "Referral", total: 18 },
      ],
      recent_products: [
        { product_id: "prd_1", name: "Growth Suite", category: "Sales Enablement" },
      ],
    },
    leads: [
      { lead_id: "led_1", company_name: "Apex Infra", contact_person_name: "Ravi Shah", status: "QUALIFIED", priority: "HIGH" },
      { lead_id: "led_2", company_name: "Verdant Labs", contact_person_name: "Neha Roy", status: "NEW", priority: "MEDIUM" },
    ],
    products: [{ product_id: "prd_1", name: "Growth Suite", category: "Sales Enablement" }],
    reminders: [
      { reminder_id: "rem_1", company_name: "Apex Infra", contact_person_name: "Ravi Shah", due_at: "2026-04-01T09:00:00.000Z" },
    ],
    users: [
      { user_id: "usr_1", full_name: "Aman Verma", role: "MANAGER", talent_id: "TAL-NORT-1A2B" },
      { user_id: "usr_2", full_name: "Sara Khan", role: "SALES", talent_id: "TAL-NORT-3C4D" },
    ],
  },
  MANAGER: {
    summary: {
      team_size: 12,
      pending_reminders: 8,
      lead_counts: [
        { status: "NEW", total: 7 },
        { status: "CONTACTED", total: 12 },
        { status: "NEGOTIATION", total: 5 },
      ],
      source_mix: [{ lead_source: "Campaign", total: 11 }],
    },
    leads: [
      { lead_id: "led_3", company_name: "Helio Energy", contact_person_name: "Puneet Das", status: "CONTACTED", priority: "HIGH" },
    ],
    reminders: [
      { reminder_id: "rem_2", company_name: "Helio Energy", contact_person_name: "Puneet Das", due_at: "2026-04-02T11:30:00.000Z" },
    ],
    products: [],
    users: [
      { user_id: "usr_3", full_name: "Team South", role: "SALES", talent_id: "TAL-SOUT-4E5F" },
    ],
  },
  SALES: {
    summary: {
      lead_counts: [
        { status: "NEW", total: 4 },
        { status: "PROPOSAL", total: 3 },
        { status: "WON", total: 2 },
      ],
      pending_reminders: 5,
      recent_activity: [
        { activity_id: "act_1", message: "Proposal sent to Helio Energy" },
      ],
    },
    leads: [
      { lead_id: "led_4", company_name: "BlueHarbor", contact_person_name: "Anita Bose", status: "PROPOSAL", priority: "HIGH" },
    ],
    reminders: [
      { reminder_id: "rem_3", company_name: "BlueHarbor", contact_person_name: "Anita Bose", due_at: "2026-04-01T13:00:00.000Z" },
    ],
    products: [],
    users: [],
  },
  MARKETING: {
    summary: {
      lead_counts: [
        { status: "NEW", total: 11 },
        { status: "QUALIFIED", total: 6 },
      ],
      pending_reminders: 3,
      recent_activity: [{ activity_id: "act_2", message: "Campaign webinar import finished" }],
    },
    leads: [
      { lead_id: "led_5", company_name: "Nova Freight", contact_person_name: "Kiran Sen", status: "NEW", priority: "MEDIUM" },
    ],
    reminders: [],
    products: [],
    users: [],
  },
  SUPPORT: {
    summary: {
      lead_counts: [
        { status: "CONTACTED", total: 15 },
        { status: "NEGOTIATION", total: 4 },
      ],
      pending_reminders: 7,
      recent_activity: [{ activity_id: "act_3", message: "Escalation note added for Apex Infra" }],
    },
    leads: [
      { lead_id: "led_6", company_name: "Apex Infra", contact_person_name: "Ravi Shah", status: "NEGOTIATION", priority: "HIGH" },
    ],
    reminders: [],
    products: [],
    users: [],
  },
};

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function getLeadTotals(leadCounts = []) {
  return leadCounts.reduce((sum, item) => sum + Number(item.total || 0), 0);
}

function buildCards(role, summary) {
  if (role === "SUPER_ADMIN") {
    return [
      { label: "Companies", value: summary.companies },
      { label: "Users", value: summary.users },
      { label: "Leads", value: summary.leads },
      { label: "Products", value: summary.products },
    ];
  }

  if (role === "ADMIN" || role === "MANAGER") {
    return [
      { label: "Team Size", value: summary.team_size },
      { label: "Open Leads", value: getLeadTotals(summary.lead_counts) },
      { label: "Pending Follow-ups", value: summary.pending_reminders },
      { label: "Active Sources", value: (summary.source_mix || []).length },
    ];
  }

  return [
    { label: role === "MARKETING" ? "Created Leads" : "My Pipeline", value: getLeadTotals(summary.lead_counts) },
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
  const [previewRole, setPreviewRole] = useState("ADMIN");
  const [data, setData] = useState(PREVIEW_DATA.ADMIN);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const savedSession = loadSession();

    if (!savedSession) {
      setSession(null);
      setPreviewRole("ADMIN");
      setData(PREVIEW_DATA.ADMIN);
      setLoading(false);
      return;
    }

    setSession(savedSession);
  }, []);

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
          ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(session.user.role)
            ? apiRequest("/users?page_size=5", { token: session.token })
            : Promise.resolve({ items: [], meta: {} }),
          session.user.role === "SUPER_ADMIN"
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
          setError(requestError.message);
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
  }, [session]);

  useEffect(() => {
    if (!session) {
      setData(PREVIEW_DATA[previewRole]);
    }
  }, [previewRole, session]);

  const role = session?.user?.role || previewRole;
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
          <span className="eyebrow">{session ? "Live workspace" : "Preview mode"}</span>
          <h1>{role.replace("_", " ")} Dashboard</h1>
          <p>
            {session
              ? `${session.user.full_name} • ${session.company?.name || "Tenant workspace"}`
              : "Switch roles below to inspect each team view before you connect the live API."}
          </p>
        </div>

        <div className="dashboard-actions">
          {session ? (
            <>
              <span className="pill">{session.user.talent_id}</span>
              <button
                className="button ghost"
                onClick={() => {
                  clearSession();
                  setSession(null);
                  setPreviewRole("ADMIN");
                  setData(PREVIEW_DATA.ADMIN);
                  router.refresh();
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <div className="role-switcher">
              {ROLE_OPTIONS.map((option) => (
                <button
                  key={option}
                  className={option === previewRole ? "pill active" : "pill"}
                  onClick={() => setPreviewRole(option)}
                >
                  {option.replace("_", " ")}
                </button>
              ))}
            </div>
          )}
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
              <p className="muted">No pending reminders in this preview.</p>
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
            <h2>{role === "SUPER_ADMIN" ? "Recent Companies" : "Team Directory"}</h2>
            <span className="pill">{role === "SUPER_ADMIN" ? companies.length : users.length}</span>
          </div>
          <div className="table-stack">
            {role === "SUPER_ADMIN"
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

            {role === "SUPER_ADMIN" && !companies.length ? (
              <p className="muted">New tenants will appear here as companies onboard.</p>
            ) : null}
            {role !== "SUPER_ADMIN" && !users.length ? (
              <p className="muted">Invite managers, sales, marketing, and support users to populate this view.</p>
            ) : null}
          </div>
        </article>
      </section>
    </div>
  );
}
