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
      router.push(ROLE_HOME_ROUTE[role] || "/dashboard");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell">
      <SiteHeader compact />

      <main className="auth-page auth-sky-page">
        <section className="auth-stage">
          <div className="auth-stage-form">
            <div className="auth-stage-topbar">
              <span className="eyebrow">Login</span>
              <div className="auth-stage-switch">
                <span>New workspace?</span>
                <Link href="/register">Sign up</Link>
              </div>
            </div>

            <div className="auth-copy-block">
              <h1>Open your company workspace</h1>
              <p>Login with your GreenCRM email and password to enter the dashboard designed for your role.</p>
            </div>

            {error ? <div className="alert error">{error}</div> : null}

            <form className="form-grid" onSubmit={handleSubmit}>
              <label className="field">
                <span>Work Email</span>
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

              <div className="auth-actions-row">
                <button className="button primary" type="submit" disabled={loading}>
                  {loading ? "Signing in..." : "Login"}
                </button>

                <Link href="/forgot-password" className="button ghost" style={{ justifyContent: "center" }}>
                  Forgot password
                </Link>
              </div>
            </form>
          </div>

          <div className="auth-stage-visual">
            <div className="auth-visual-chip">Sky-blue control layer</div>

            <div className="auth-visual-card tall">
              <span>Team access</span>
              <strong>Role-based dashboards</strong>
              <p>Admin, sales, marketing, legal, finance, support, and viewer each land on the right workspace.</p>
            </div>

            <div className="auth-visual-card stat">
              <span>Unread feed</span>
              <strong>28</strong>
              <div className="auth-wave">
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>

            <div className="auth-visual-rule">
              <div className="auth-visual-lines">
                <span />
                <span />
                <span />
              </div>
              <div>
                <strong>Your CRM, Your Rules</strong>
                <p>Keep access, onboarding, and live work under one company-safe structure.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
