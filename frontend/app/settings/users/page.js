"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../../../components/dashboard/DashboardShell";
import { apiRequest } from "../../../lib/api";
import { loadSession } from "../../../lib/session";

export default function UserSettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", role: "sales", password: "" });

  async function loadUsers(activeSession) {
    const response = await apiRequest("/auth/users?page_size=20", { token: activeSession.token });
    setUsers(response.items || []);
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

    try {
      await apiRequest("/auth/create-employee", {
        method: "POST",
        token: session.token,
        body: form,
      });
      setForm({ name: "", email: "", role: "sales", password: "" });
      await loadUsers(session);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function toggleUser(userId, isActive) {
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

  return (
    <DashboardShell session={session} title="User Settings" eyebrow="Team Management" heroStats={heroStats}>
      {error ? <div className="alert error">{error}</div> : null}
      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-header"><h2>Create Team Member</h2></div>
          <p className="muted" style={{ marginBottom: "1rem" }}>
            Isi form se support, sales, marketing, legal-team, finance-team, viewer aur manager roles create hote hain.
            {session?.user?.role === "super-admin"
              ? " Company-admin identity ke liye Platform Users ya Companies screen use karo."
              : ""}
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
