"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import SiteHeader from "../../components/SiteHeader";
import { apiRequest } from "../../lib/api";
import { ROLE_HOME_ROUTE } from "../../lib/roles";
import { saveSession } from "../../lib/session";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const session = await apiRequest("/auth/login", {
        method: "POST",
        body: form,
      });

      saveSession(session);
      const role = session?.user?.role || "";
      router.push(ROLE_HOME_ROUTE[role] || "/dashboard/viewer");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell">
      <SiteHeader compact />

      <main className="auth-page">
        <section className="auth-card">
          <span className="eyebrow">Login</span>
          <h1>Enter your workspace</h1>
          <p>Use your platform owner, company admin, or team credentials to access the CRM.</p>

          {error ? <div className="alert error">{error}</div> : null}

          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="owner@company.com"
                required
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="Enter password"
                required
              />
            </label>

            <button className="button primary" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </button>

            <Link href="/forgot-password" className="button ghost" style={{ justifyContent: "center" }}>
              Forgot password
            </Link>
          </form>
        </section>
      </main>
    </div>
  );
}
