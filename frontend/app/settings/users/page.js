"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../../../components/dashboard/DashboardShell";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";

const ROLE_LIMIT_FIELDS = [
  { key: "admin", label: "Admins" },
  { key: "manager", label: "Managers" },
  { key: "sales", label: "Sales" },
  { key: "marketing", label: "Marketing" },
  { key: "support", label: "Support" },
  { key: "legal-team", label: "Legal Team" },
  { key: "finance-team", label: "Finance Team" },
  { key: "viewer", label: "Viewer" },
];

function parseJson(rawValue) {
  if (!rawValue) return {};
  if (typeof rawValue === "string") {
    try {
      return JSON.parse(rawValue);
    } catch (_error) {
      return {};
    }
  }
  return typeof rawValue === "object" ? rawValue : {};
}

export default function UserSettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [users, setUsers] = useState([]);
  const [company, setCompany] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", email: "", role: "sales", password: "" });

  async function loadUsers(activeSession) {
    const [usersResponse, profileResponse] = await Promise.all([
      apiRequest("/auth/users?page_size=50", { token: activeSession.token }),
      apiRequest("/auth/profile", { token: activeSession.token }),
    ]);
    setUsers(usersResponse.items || []);
    setCompany(profileResponse.company || null);
  }

  useEffect(() => {
    const activeSession = loadSession();
    if (!activeSession) {
      router.replace("/login");
      return;
    }
    if (!["super-admin", "admin"].includes(activeSession.user?.role)) {
      router.replace("/dashboard");
      return;
    }
    setSession(activeSession);
    loadUsers(activeSession).catch((requestError) => setError(requestError.message));
  }, [router]);

  async function createUser(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const response = await apiRequest("/auth/create-employee", {
        method: "POST",
        token: session.token,
        body: form,
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

      setForm({ name: "", email: "", role: "sales", password: "" });
      await loadUsers(session);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function toggleUser(userId, isActive) {
    setMessage("");

    try {
      await apiRequest(`/auth/users/${userId}/toggle`, {
        method: "PUT",
        token: session.token,
        body: { is_active: !isActive },
      });
      await loadUsers(session);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const heroStats = [
    { label: "Total Members", value: users.length },
    { label: "Active", value: users.filter((user) => user.is_active).length, color: "#1fc778" },
    { label: "Roles", value: new Set(users.map((user) => user.role).filter(Boolean)).size, color: "#4f8cff" },
    { label: "Pending Invite", value: users.filter((user) => !user.is_active).length, color: "#f4a42d" },
  ];
  const staffLimits = parseJson(parseJson(company?.service_settings).staff_limits);
  const roleUsage = ROLE_LIMIT_FIELDS.map((field) => {
    const used = users.filter((user) => user.is_active && user.role === field.key).length;
    const limit = staffLimits[field.key];
    return {
      ...field,
      used,
      limit: limit === null || limit === undefined || limit === "" ? null : Number(limit),
    };
  });

  return (
    <DashboardShell session={session} title="User Settings" heroStats={heroStats}>
      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert">{message}</div> : null}

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-header"><h2>Create Team Member</h2></div>
          <p className="muted" style={{ marginBottom: "1rem" }}>
            Isi form se support, sales, marketing, legal-team, finance-team, viewer aur manager roles create hote hain.
            {session?.user?.role === "super-admin" ? " Company-admin identity ke liye Platform Users ya Companies screen use karo." : ""}
          </p>

          <form className="form-grid" onSubmit={createUser}>
            <label className="field"><span>Name</span><input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required /></label>
            <label className="field"><span>Email</span><input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required /></label>
            <label className="field"><span>Role</span><select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}><option value="manager">manager</option><option value="sales">sales</option><option value="marketing">marketing</option><option value="support">support</option><option value="legal-team">legal-team</option><option value="finance-team">finance-team</option><option value="viewer">viewer</option></select></label>
            <label className="field"><span>Password</span><input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="Optional temp password" /></label>
            <button className="button primary" type="submit">Create Employee</button>
          </form>
        </article>

        <article className="panel">
          <div className="panel-header"><h2>Seat Usage</h2></div>
          <div className="table-stack">
            {roleUsage.map((entry) => (
              <div className="table-row" key={entry.key}>
                <div>
                  <strong>{entry.label}</strong>
                  <span>
                    {entry.limit === null
                      ? `${entry.used} active | unlimited`
                      : `${entry.used} active of ${entry.limit} allowed`}
                  </span>
                </div>
                <strong style={{ color: entry.limit !== null && entry.used >= entry.limit ? "#e05252" : "#1f2937" }}>
                  {entry.limit === null ? "Open" : `${Math.max(entry.limit - entry.used, 0)} left`}
                </strong>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header"><h2>Team Members</h2></div>
          <div className="table-stack">
            {users.length ? users.map((user) => (
              <div className="table-row" key={user.user_id}>
                <div>
                  <strong>{user.name}</strong>
                  <span>{user.email} · {user.role}</span>
                </div>
                <button className="button ghost" onClick={() => toggleUser(user.user_id, user.is_active)}>
                  {user.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            )) : <p className="muted">No users found.</p>}
          </div>
        </article>
      </section>
    </DashboardShell>
  );
}
