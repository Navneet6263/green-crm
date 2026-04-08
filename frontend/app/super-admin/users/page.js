"use client";

import { useState } from "react";

import WorkspacePage from "../../../components/dashboard/WorkspacePage";
import { apiRequest } from "../../../lib/api";

function titleize(value = "") {
  return String(value)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function AccessControlContent({ session, data, error, loading, refresh }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "super-admin",
    company_id: "",
  });
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState("");

  const users = data.users?.items || [];
  const companies = data.companies?.items || [];
  const safety = data.safety || {};
  const slotsLeft = Math.max(0, Number(safety.max_super_admins || 0) - Number(safety.super_admin_count || 0));

  async function handleCreateIdentity(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        ...(form.role === "admin" ? { company_id: form.company_id } : {}),
      };

      const response = await apiRequest("/auth/create-employee", {
        method: "POST",
        token: session.token,
        body: payload,
      });

      setMessage(
        response.temporary_password
          ? `User created. Temporary password: ${response.temporary_password}`
          : "User created successfully."
      );
      setForm({
        name: "",
        email: "",
        password: "",
        role: "super-admin",
        company_id: "",
      });
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
      {message ? <div className={message.startsWith("User created") ? "alert" : "alert error"}>{message}</div> : null}
      {loading ? <div className="alert">Loading platform users...</div> : null}

      {!loading ? (
        <section className="dashboard-grid">
          <article className="panel">
            <div className="panel-header">
              <h2>Create Admin Access</h2>
              <span className="pill">{slotsLeft} super-admin slots left</span>
            </div>

            <p className="muted" style={{ marginBottom: "1rem" }}>
              Create a new super-admin or company-admin from here. Company admins can then manage their own team
              from the tenant workspace.
            </p>

            <form className="form-grid" onSubmit={handleCreateIdentity}>
              <label className="field">
                <span>Identity Type</span>
                <select
                  value={form.role}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      role: event.target.value,
                      company_id: event.target.value === "admin" ? current.company_id : "",
                    }))
                  }
                >
                  <option value="super-admin">super-admin</option>
                  <option value="admin">company-admin</option>
                </select>
              </label>

              {form.role === "admin" ? (
                <label className="field">
                  <span>Target Company</span>
                  <select
                    value={form.company_id}
                    onChange={(event) => setForm((current) => ({ ...current, company_id: event.target.value }))}
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

              <label className="field">
                <span>Name</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </label>

              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  required
                />
              </label>

              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Optional. Leave empty to auto-generate a temporary password."
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
              <div className="table-row">
                <div>
                  <strong>Super Admin</strong>
                  <span>Platform-wide control, limited by the configured maximum count.</span>
                </div>
                <strong>{safety.super_admin_count || 0} active</strong>
              </div>
              <div className="table-row">
                <div>
                  <strong>Company Admin</strong>
                  <span>Tenant owner with company settings, team access, products, and analytics control.</span>
                </div>
                <strong>{users.filter((user) => user.role === "admin").length} users</strong>
              </div>
              <div className="table-row">
                <div>
                  <strong>Department Roles</strong>
                  <span>Support, sales, legal, and finance roles are managed from the company workspace.</span>
                </div>
                <strong>Role based</strong>
              </div>
            </div>
          </article>

          <article className="panel" style={{ gridColumn: "1 / -1" }}>
            <div className="panel-header">
              <h2>Admin Directory</h2>
              <span className="pill">{users.length} identities</span>
            </div>

            <div className="table-stack">
              {users.length ? (
                users.map((user) => (
                  <div className="table-row" key={user.user_id}>
                    <div>
                      <strong>{user.name}</strong>
                      <span>{user.email} · {user.company_name || user.company_id || "Platform"}</span>
                    </div>
                    <div className="table-row-actions">
                      <span className="role-badge" style={{ "--rc": user.role === "super-admin" ? "#9a7cff" : "#4f8cff" }}>
                        {titleize(user.role)}
                      </span>
                      <span className="status-badge" style={{ "--sc": user.is_active ? "#1fc778" : "#e05252" }}>
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                      <button
                        className="button ghost"
                        onClick={() => handleToggleUser(user)}
                        disabled={togglingUserId === user.user_id}
                      >
                        {togglingUserId === user.user_id ? "Updating..." : user.is_active ? "Disable" : "Enable"}
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
      eyebrow="Admins & Super Admins"
      allowedRoles={["super-admin"]}
      requestBuilder={() => [
        { key: "users", path: "/super-admin/users?page_size=20" },
        { key: "companies", path: "/companies?page_size=50" },
        { key: "safety", path: "/super-admin/safety-status" },
      ]}
      heroStats={({ data }) => {
        const users = data.users?.items || [];
        const safety = data.safety || {};

        return [
          { label: "Admin Accounts", value: users.length },
          { label: "Super Admins", value: users.filter((user) => user.role === "super-admin").length, color: "#9a7cff" },
          { label: "Company Admins", value: users.filter((user) => user.role === "admin").length, color: "#4f8cff" },
          {
            label: "Open Slots",
            value: Math.max(0, Number(safety.max_super_admins || 0) - Number(safety.super_admin_count || 0)),
            color: "#f4a42d",
          },
        ];
      }}
    >
      {(props) => <AccessControlContent {...props} />}
    </WorkspacePage>
  );
}
