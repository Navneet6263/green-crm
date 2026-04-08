"use client";

import { useEffect, useMemo, useState } from "react";

import WorkspacePage from "../../../components/dashboard/WorkspacePage";
import { apiRequest } from "../../../lib/api";

const ACCESS_FEATURES = [
  {
    key: "dashboard",
    label: "Dashboard",
    group: "Core",
    mandatory: true,
    description: "Main cockpit, KPIs, and top-level daily view.",
  },
  {
    key: "leads",
    label: "Leads",
    group: "Growth",
    description: "Lead capture, list views, detail pages, and follow-up flow.",
  },
  {
    key: "customers",
    label: "Customers",
    group: "Growth",
    description: "Customer directory and account-level visibility.",
  },
  {
    key: "workflow",
    label: "Workflow",
    group: "Ops",
    description: "Legal and finance stage movement for revenue completion.",
  },
  {
    key: "products",
    label: "Products",
    group: "Ops",
    description: "Tenant product catalog and internal offer setup.",
  },
  {
    key: "team_management",
    label: "Team Management",
    group: "Ops",
    description: "Create employees, manage roles, and control activation.",
  },
  {
    key: "tasks",
    label: "Tasks",
    group: "Execution",
    description: "Task queue and daily workload coordination.",
  },
  {
    key: "calendar",
    label: "Calendar",
    group: "Execution",
    description: "Follow-up schedule, meetings, and date visibility.",
  },
  {
    key: "communications",
    label: "Communications",
    group: "Service",
    description: "Alerts, activity feed, and message-focused surfaces.",
  },
  {
    key: "analytics",
    label: "Analytics",
    group: "Insights",
    description: "Performance dashboards, source mix, and conversion insight.",
  },
  {
    key: "support",
    label: "Support",
    group: "Service",
    description: "Support inbox, escalations, and ticket visibility.",
  },
  {
    key: "documents",
    label: "Documents",
    group: "Compliance",
    description: "Document review surfaces for legal and finance teams.",
  },
  {
    key: "performance",
    label: "Performance",
    group: "Insights",
    description: "Team comparison and manager performance reporting.",
  },
];

const ACCESS_PRESETS = {
  full: ACCESS_FEATURES.reduce((accumulator, feature) => {
    accumulator[feature.key] = true;
    return accumulator;
  }, {}),
  core: ACCESS_FEATURES.reduce((accumulator, feature) => {
    accumulator[feature.key] = [
      "dashboard",
      "leads",
      "customers",
      "workflow",
      "team_management",
      "communications",
      "support",
    ].includes(feature.key);
    return accumulator;
  }, {}),
  lite: ACCESS_FEATURES.reduce((accumulator, feature) => {
    accumulator[feature.key] = ["dashboard", "team_management", "communications"].includes(feature.key);
    return accumulator;
  }, {}),
};

function parseServiceAccess(rawValue) {
  if (!rawValue) {
    return {};
  }

  if (typeof rawValue === "string") {
    try {
      return JSON.parse(rawValue);
    } catch (_error) {
      return {};
    }
  }

  return typeof rawValue === "object" ? rawValue : {};
}

function buildAccessState(rawValue) {
  const parsed = parseServiceAccess(rawValue);

  return ACCESS_FEATURES.reduce((accumulator, feature) => {
    accumulator[feature.key] = feature.mandatory ? true : parsed[feature.key] !== false;
    return accumulator;
  }, {});
}

function getEnabledFeatureCount(access) {
  return ACCESS_FEATURES.filter((feature) => access[feature.key] !== false).length;
}

function getStatusColor(status) {
  if (status === "active") {
    return "#1fc778";
  }

  if (status === "trial") {
    return "#f4a42d";
  }

  return "#e05252";
}

function titleize(value = "") {
  return String(value)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function CompaniesContent({ session, data, error, loading, refresh }) {
  const [form, setForm] = useState({
    name: "",
    slug: "",
    admin_name: "",
    admin_email: "",
    admin_password: "",
    industry: "",
    website: "",
    status: "trial",
  });
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [accessDraft, setAccessDraft] = useState(buildAccessState());
  const [accessMessage, setAccessMessage] = useState("");
  const [savingAccess, setSavingAccess] = useState(false);

  const companies = data.companies?.items || [];
  const normalizedCompanies = useMemo(
    () =>
      companies.map((company) => ({
        ...company,
        access: buildAccessState(company.service_access),
      })),
    [companies]
  );
  const selectedCompany = useMemo(
    () =>
      normalizedCompanies.find((company) => company.company_id === selectedCompanyId) ||
      normalizedCompanies[0] ||
      null,
    [normalizedCompanies, selectedCompanyId]
  );

  useEffect(() => {
    if (!normalizedCompanies.length) {
      setSelectedCompanyId("");
      return;
    }

    if (!normalizedCompanies.some((company) => company.company_id === selectedCompanyId)) {
      setSelectedCompanyId(normalizedCompanies[0].company_id);
    }
  }, [normalizedCompanies, selectedCompanyId]);

  useEffect(() => {
    if (!selectedCompany) {
      setAccessDraft(buildAccessState());
      return;
    }

    setAccessDraft(buildAccessState(selectedCompany.service_access));
    setAccessMessage("");
  }, [selectedCompany]);

  async function handleCreateCompany(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const response = await apiRequest("/companies", {
        method: "POST",
        token: session.token,
        body: form,
      });

      setMessage(
        response.admin_temporary_password
          ? `Company created. Admin temporary password: ${response.admin_temporary_password}`
          : "Company created successfully."
      );
      if (response.company?.company_id) {
        setSelectedCompanyId(response.company.company_id);
      }
      setForm({
        name: "",
        slug: "",
        admin_name: "",
        admin_email: "",
        admin_password: "",
        industry: "",
        website: "",
        status: "trial",
      });
      await refresh();
    } catch (requestError) {
      setMessage(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function toggleFeature(featureKey) {
    const feature = ACCESS_FEATURES.find((item) => item.key === featureKey);

    if (feature?.mandatory) {
      return;
    }

    setAccessDraft((current) => ({
      ...current,
      [featureKey]: !current[featureKey],
    }));
    setAccessMessage("");
  }

  function applyPreset(presetName) {
    setAccessDraft({ ...(ACCESS_PRESETS[presetName] || ACCESS_PRESETS.full) });
    setAccessMessage("");
  }

  async function handleSaveAccess() {
    if (!selectedCompany) {
      return;
    }

    setSavingAccess(true);
    setAccessMessage("");

    try {
      await apiRequest(`/companies/${selectedCompany.company_id}`, {
        method: "PUT",
        token: session.token,
        body: {
          service_access: accessDraft,
        },
      });

      setAccessMessage("Access rules updated successfully.");
      await refresh();
    } catch (requestError) {
      setAccessMessage(requestError.message);
    } finally {
      setSavingAccess(false);
    }
  }

  return (
    <>
      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className={message.startsWith("Company created") ? "alert" : "alert error"}>{message}</div> : null}
      {loading ? <div className="alert">Loading companies...</div> : null}

      {!loading ? (
        <section className="dashboard-shell">
          <div className="dashboard-grid">
            <article className="panel">
              <div className="panel-header">
                <h2>Create Tenant Company</h2>
              </div>

              <form className="form-grid two-column" onSubmit={handleCreateCompany}>
                <label className="field">
                  <span>Company Name</span>
                  <input
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    required
                  />
                </label>

                <label className="field">
                  <span>Slug</span>
                  <input
                    value={form.slug}
                    onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                    required
                  />
                </label>

                <label className="field">
                  <span>Admin Name</span>
                  <input
                    value={form.admin_name}
                    onChange={(event) => setForm((current) => ({ ...current, admin_name: event.target.value }))}
                    required
                  />
                </label>

                <label className="field">
                  <span>Admin Email</span>
                  <input
                    type="email"
                    value={form.admin_email}
                    onChange={(event) => setForm((current) => ({ ...current, admin_email: event.target.value }))}
                    required
                  />
                </label>

                <label className="field">
                  <span>Admin Password</span>
                  <input
                    type="password"
                    value={form.admin_password}
                    onChange={(event) => setForm((current) => ({ ...current, admin_password: event.target.value }))}
                    placeholder="Optional. Empty chhodo to temp password auto-generate hoga."
                  />
                </label>

                <label className="field">
                  <span>Status</span>
                  <select
                    value={form.status}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                  >
                    <option value="trial">trial</option>
                    <option value="active">active</option>
                    <option value="suspended">suspended</option>
                  </select>
                </label>

                <label className="field">
                  <span>Industry</span>
                  <input
                    value={form.industry}
                    onChange={(event) => setForm((current) => ({ ...current, industry: event.target.value }))}
                  />
                </label>

                <label className="field">
                  <span>Website</span>
                  <input
                    value={form.website}
                    onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
                  />
                </label>

                <div className="form-actions">
                  <button className="button primary" type="submit" disabled={submitting}>
                    {submitting ? "Creating..." : "Create Company"}
                  </button>
                </div>
              </form>
            </article>

            <article className="panel">
              <div className="panel-header">
                <h2>Tenant Access Control</h2>
                <span className="pill">
                  {selectedCompany ? `${getEnabledFeatureCount(accessDraft)}/${ACCESS_FEATURES.length} live` : "No tenant"}
                </span>
              </div>

              {selectedCompany ? (
                <>
                  <div className="company-access-head">
                    <div>
                      <span className="eyebrow">Selected tenant</span>
                      <h3>{selectedCompany.name}</h3>
                      <p>{selectedCompany.slug} | {selectedCompany.admin_email || "No admin email"}</p>
                    </div>
                    <span className="status-badge" style={{ "--sc": getStatusColor(selectedCompany.status) }}>
                      {selectedCompany.status}
                    </span>
                  </div>

                  <div className="feature-preset-row">
                    <button className="button ghost" type="button" onClick={() => applyPreset("full")}>
                      All Access
                    </button>
                    <button className="button ghost" type="button" onClick={() => applyPreset("core")}>
                      Core Only
                    </button>
                    <button className="button ghost" type="button" onClick={() => applyPreset("lite")}>
                      Lite Plan
                    </button>
                  </div>

                  {accessMessage ? (
                    <div className={accessMessage.startsWith("Access rules updated") ? "alert" : "alert error"}>
                      {accessMessage}
                    </div>
                  ) : null}

                  <div className="feature-access-grid">
                    {ACCESS_FEATURES.map((feature) => {
                      const enabled = feature.mandatory ? true : accessDraft[feature.key];

                      return (
                        <button
                          key={feature.key}
                          type="button"
                          className={`feature-access-card ${enabled ? "active" : "locked"} ${feature.mandatory ? "fixed" : ""}`}
                          onClick={() => toggleFeature(feature.key)}
                        >
                          <div className="feature-access-top">
                            <span className="feature-access-kicker">{feature.group}</span>
                            <span
                              className="status-badge"
                              style={{ "--sc": enabled ? "#1fc778" : "#e05252" }}
                            >
                              {feature.mandatory ? "required" : enabled ? "enabled" : "locked"}
                            </span>
                          </div>
                          <strong>{feature.label}</strong>
                          <p>{feature.description}</p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="feature-access-actions">
                    <button className="button primary" type="button" onClick={handleSaveAccess} disabled={savingAccess}>
                      {savingAccess ? "Saving..." : "Save Access Rules"}
                    </button>
                  </div>
                </>
              ) : (
                <p className="muted">Pehle tenant create karo ya existing tenant select karo.</p>
              )}
            </article>
          </div>

          <article className="panel">
            <div className="panel-header">
              <h2>Companies Directory</h2>
              <span className="pill">{normalizedCompanies.length} companies</span>
            </div>

            <div className="table-stack">
              {normalizedCompanies.length ? (
                normalizedCompanies.map((company) => (
                  <button
                    className={`table-row tenant-row ${selectedCompany?.company_id === company.company_id ? "selected" : ""}`}
                    key={company.company_id}
                    type="button"
                    onClick={() => setSelectedCompanyId(company.company_id)}
                  >
                    <div>
                      <strong>{company.name}</strong>
                      <span>{company.slug} | {company.admin_email || "No admin email"}</span>
                    </div>
                    <div className="tenant-row-meta">
                      <span className="status-badge" style={{ "--sc": getStatusColor(company.status) }}>
                        {titleize(company.status)}
                      </span>
                      <span className="role-badge" style={{ "--rc": "#2d63c8" }}>
                        {getEnabledFeatureCount(company.access)}/{ACCESS_FEATURES.length} enabled
                      </span>
                      <strong>{company.settings_currency || "INR"}</strong>
                    </div>
                  </button>
                ))
              ) : (
                <p className="muted">No companies found.</p>
              )}
            </div>
          </article>
        </section>
      ) : null}
    </>
  );
}

export default function SuperAdminCompaniesPage() {
  return (
    <WorkspacePage
      title="Companies"
      eyebrow="Tenant Directory"
      allowedRoles={["super-admin"]}
      requestBuilder={() => [{ key: "companies", path: "/companies?page_size=20" }]}
      heroStats={({ data }) => {
        const companies = data.companies?.items || [];
        return [
          { label: "Tenants", value: companies.length },
          { label: "Active", value: companies.filter((company) => company.status === "active").length, color: "#1fc778" },
          { label: "Trial", value: companies.filter((company) => company.status === "trial").length, color: "#f4a42d" },
          { label: "Suspended", value: companies.filter((company) => company.status === "suspended").length, color: "#e05252" },
        ];
      }}
    >
      {(props) => <CompaniesContent {...props} />}
    </WorkspacePage>
  );
}
