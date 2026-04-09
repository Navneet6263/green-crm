"use client";

import { useEffect, useMemo, useState } from "react";

import WorkspacePage from "../../../components/dashboard/WorkspacePage";
import { apiRequest } from "../../../lib/api";

const PLATFORM_ROLE_OPTIONS = ["platform-admin", "platform-manager"];
const TENANT_ROLE_OPTIONS = [
  "admin",
  "manager",
  "sales",
  "marketing",
  "support",
  "legal-team",
  "finance-team",
  "viewer",
];

function titleize(value = "") {
  return String(value)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function createDefaultForm(canCreatePlatformRoles) {
  return {
    name: "",
    email: "",
    password: "",
    role: canCreatePlatformRoles ? "admin" : "manager",
    company_id: "",
    managed_company_ids: [],
  };
}

function isPlatformOperatorRole(role) {
  return PLATFORM_ROLE_OPTIONS.includes(role);
}

function isPlatformRootRole(role) {
  return role === "super-admin" || isPlatformOperatorRole(role);
}

function formatCompanyNames(companyIds, companiesById) {
  const items = (Array.isArray(companyIds) ? companyIds : [])
    .map((companyId) => companiesById.get(companyId)?.name || companyId)
    .filter(Boolean);

  return items.length ? items.join(", ") : "No company assignment";
}

function RoleCard({ title, description, value, color }) {
  return (
    <div className="table-row">
      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
      <strong style={{ color }}>{value}</strong>
    </div>
  );
}

function AccessControlContent({ session, data, error, loading, refresh }) {
  const canCreatePlatformRoles = session?.user?.role === "super-admin";
  const [form, setForm] = useState(createDefaultForm(canCreatePlatformRoles));
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState("");

  const users = data.users?.items || [];
  const companies = data.companies?.items || [];
  const safety = data.safety || {};
  const slotsLeft = Math.max(
    0,
    Number(safety.max_super_admins || 0) - Number(safety.super_admin_count || 0)
  );
  const companiesById = useMemo(
    () => new Map(companies.map((company) => [company.company_id, company])),
    [companies]
  );
  const roleOptions = canCreatePlatformRoles
    ? ["super-admin", ...PLATFORM_ROLE_OPTIONS, ...TENANT_ROLE_OPTIONS]
    : TENANT_ROLE_OPTIONS;

  const selectedRoleIsPlatformRoot = isPlatformRootRole(form.role);
  const selectedRoleIsPlatformOperator = isPlatformOperatorRole(form.role);

  useEffect(() => {
    setForm(createDefaultForm(canCreatePlatformRoles));
  }, [canCreatePlatformRoles]);

  function updateForm(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function toggleManagedCompany(companyId) {
    setForm((current) => ({
      ...current,
      managed_company_ids: current.managed_company_ids.includes(companyId)
        ? current.managed_company_ids.filter((item) => item !== companyId)
        : [...current.managed_company_ids, companyId],
    }));
  }

  async function handleCreateIdentity(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const response = await apiRequest("/auth/create-employee", {
        method: "POST",
        token: session.token,
        body: {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          ...(selectedRoleIsPlatformOperator
            ? { managed_company_ids: form.managed_company_ids }
            : {}),
          ...(!selectedRoleIsPlatformRoot && form.company_id
            ? { company_id: form.company_id }
            : {}),
        },
      });

      setMessage(
        response.temporary_password
          ? `User created. Temporary password: ${response.temporary_password}${response.credential_delivery?.delivery === "queued" ? " | Credentials email is sending in background." : ""}${response.credential_delivery?.preview_login_url ? ` | Preview login: ${response.credential_delivery.preview_login_url}` : ""}`
          : response.credential_delivery?.delivery === "email"
            ? "User created and credentials email sent."
            : response.credential_delivery?.delivery === "queued"
              ? "User created. Credentials email is sending in background."
            : "User created successfully."
      );

      setForm(createDefaultForm(canCreatePlatformRoles));
      await refresh();
    } catch (requestError) {
      setMessage(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleUser(user) {
    setTogglingUserId(user.user_id);
    setMessage("");

    try {
      await apiRequest(
        user.is_active
          ? `/super-admin/deactivate/${user.user_id}`
          : `/super-admin/activate/${user.user_id}`,
        {
          method: "PUT",
          token: session.token,
        }
      );
      await refresh();
    } catch (requestError) {
      setMessage(requestError.message);
    } finally {
      setTogglingUserId("");
    }
  }

  return (
    <>
      {error ? <div className="alert error">{error}</div> : null}
      {message ? (
        <div className={message.startsWith("User created") ? "alert" : "alert error"}>
          {message}
        </div>
      ) : null}
      {loading ? <div className="alert">Loading platform users...</div> : null}

      {!loading ? (
        <section className="dashboard-grid">
          <article className="panel">
            <div className="panel-header">
              <h2>Create Access</h2>
              <span className="pill">
                {canCreatePlatformRoles ? `${slotsLeft} super-admin slots left` : `${companies.length} assigned companies`}
              </span>
            </div>

            <p className="muted" style={{ marginBottom: "1rem" }}>
              {canCreatePlatformRoles
                ? "Create platform operators, super-admins, and tenant users from one delegated access desk."
                : "Create tenant users for the companies assigned to your platform account. Platform roles remain restricted to super-admin control."}
            </p>

            <form className="form-grid" onSubmit={handleCreateIdentity}>
              <label className="field">
                <span>Role</span>
                <select
                  value={form.role}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      role: event.target.value,
                      company_id: isPlatformRootRole(event.target.value) ? "" : current.company_id,
                      managed_company_ids: isPlatformOperatorRole(event.target.value)
                        ? current.managed_company_ids
                        : [],
                    }))
                  }
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>

              {!selectedRoleIsPlatformRoot ? (
                <label className="field">
                  <span>Target Company</span>
                  <select
                    value={form.company_id}
                    onChange={(event) => updateForm("company_id", event.target.value)}
                    required
                  >
                    <option value="">Select company</option>
                    {companies.map((company) => (
                      <option key={company.company_id} value={company.company_id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {selectedRoleIsPlatformOperator ? (
                <div className="field full-width">
                  <span>Managed Companies</span>
                  <div className="feature-access-grid">
                    {companies.map((company) => {
                      const active = form.managed_company_ids.includes(company.company_id);
                      return (
                        <button
                          key={company.company_id}
                          type="button"
                          className={`feature-access-card ${active ? "active" : "locked"}`}
                          onClick={() => toggleManagedCompany(company.company_id)}
                        >
                          <div className="feature-access-top">
                            <span className="feature-access-kicker">
                              {titleize(company.status || "active")}
                            </span>
                            <span
                              className="status-badge"
                              style={{ "--sc": active ? "#1fc778" : "#64748b" }}
                            >
                              {active ? "assigned" : "tap to assign"}
                            </span>
                          </div>
                          <strong>{company.name}</strong>
                          <p>{company.slug || company.company_id}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <label className="field">
                <span>Name</span>
                <input
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateForm("email", event.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => updateForm("password", event.target.value)}
                  placeholder="Optional. Leave empty to auto-generate."
                />
              </label>
              <div className="form-actions">
                <button className="button primary" type="submit" disabled={submitting}>
                  {submitting ? "Creating..." : "Create Access"}
                </button>
              </div>
            </form>
          </article>

          <article className="panel">
            <div className="panel-header">
              <h2>Access Structure</h2>
            </div>
            <div className="table-stack">
              <RoleCard
                title="Super Admin"
                description="Global platform control including platform defaults and other platform operators."
                value={users.filter((user) => user.role === "super-admin").length}
                color="#9a7cff"
              />
              <RoleCard
                title="Platform Admin"
                description="Delegated company control with tenant settings, tenant users, and activation access."
                value={users.filter((user) => user.role === "platform-admin").length}
                color="#2784ff"
              />
              <RoleCard
                title="Platform Manager"
                description="Assigned-company operations without tenant-status or SMTP secret changes."
                value={users.filter((user) => user.role === "platform-manager").length}
                color="#0ea5a4"
              />
              <RoleCard
                title="Tenant Roles"
                description="Company admins, managers, and team members attached to tenant workspaces."
                value={users.filter((user) => !isPlatformRootRole(user.role)).length}
                color="#475569"
              />
            </div>
          </article>

          <article className="panel" style={{ gridColumn: "1 / -1" }}>
            <div className="panel-header">
              <h2>Access Directory</h2>
              <span className="pill">{users.length} identities</span>
            </div>

            <div className="table-stack">
              {users.length ? (
                users.map((user) => (
                  <div className="table-row" key={user.user_id}>
                    <div>
                      <strong>{user.name}</strong>
                      <span>
                        {user.email} | {user.company_name || user.company_id || "Platform"}
                      </span>
                      {isPlatformOperatorRole(user.role) ? (
                        <span>
                          Managed: {formatCompanyNames(user.managed_company_ids, companiesById)}
                        </span>
                      ) : null}
                    </div>
                    <div className="table-row-actions">
                      <span
                        className="role-badge"
                        style={{
                          "--rc":
                            user.role === "super-admin"
                              ? "#9a7cff"
                              : user.role === "platform-admin"
                                ? "#2784ff"
                                : user.role === "platform-manager"
                                  ? "#0ea5a4"
                                  : user.role === "manager"
                                    ? "#23b5d3"
                                    : "#4f8cff",
                        }}
                      >
                        {titleize(user.role)}
                      </span>
                      <span
                        className="status-badge"
                        style={{ "--sc": user.is_active ? "#1fc778" : "#e05252" }}
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                      <button
                        className="button ghost"
                        onClick={() => handleToggleUser(user)}
                        disabled={togglingUserId === user.user_id}
                      >
                        {togglingUserId === user.user_id
                          ? "Updating..."
                          : user.is_active
                            ? "Disable"
                            : "Enable"}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="muted">No platform users found.</p>
              )}
            </div>
          </article>
        </section>
      ) : null}
    </>
  );
}

export default function SuperAdminUsersPage() {
  return (
    <WorkspacePage
      title="Platform Users"
      eyebrow="Admins, Managers & Team Roles"
      allowedRoles={["super-admin", "platform-admin"]}
      requestBuilder={() => [
        { key: "users", path: "/super-admin/users?page_size=80" },
        { key: "companies", path: "/companies?page_size=80" },
        { key: "safety", path: "/super-admin/safety-status" },
      ]}
      heroStats={({ data }) => {
        const users = data.users?.items || [];
        const safety = data.safety || {};
        return [
          { label: "Admin Accounts", value: users.length },
          {
            label: "Super Admins",
            value: users.filter((user) => user.role === "super-admin").length,
            color: "#9a7cff",
          },
          {
            label: "Platform Admins",
            value: users.filter((user) => user.role === "platform-admin").length,
            color: "#2784ff",
          },
          {
            label: "Platform Managers",
            value: users.filter((user) => user.role === "platform-manager").length,
            color: "#0ea5a4",
          },
          {
            label: "Open Slots",
            value: Math.max(
              0,
              Number(safety.max_super_admins || 0) - Number(safety.super_admin_count || 0)
            ),
            color: "#f4a42d",
          },
        ];
      }}
    >
      {(props) => <AccessControlContent {...props} />}
    </WorkspacePage>
  );
}
