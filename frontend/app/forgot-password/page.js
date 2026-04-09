"use client";

import Link from "next/link";
import { useState } from "react";

import SiteHeader from "../../components/SiteHeader";
import { apiRequest } from "../../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await apiRequest("/auth/forgot-password", {
        method: "POST",
        body: { email },
      });
      setResult(response);
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
              <span className="eyebrow">Forgot Password</span>
              <div className="auth-stage-switch">
                <span>Remember your password?</span>
                <Link href="/login">Login</Link>
              </div>
            </div>

            <div className="auth-copy-block">
              <h1>Reset your company access</h1>
              <p>
                Enter the email used in GreenCRM. If SMTP is active, the reset link goes to the inbox. If mail is not
                configured yet, you will get a local preview link here.
              </p>
            </div>

            {error ? <div className="alert error">{error}</div> : null}
            {result ? (
              <div className="alert">
                <strong>{result.message}</strong>
                {result.delivery === "email" ? (
                  <p className="muted" style={{ marginTop: "0.75rem" }}>
                    Reset link sent to the registered email address.
                  </p>
                ) : null}
                {result.preview_reset_url ? (
                  <div className="auth-actions-row" style={{ marginTop: "0.9rem" }}>
                    <Link
                      href={result.preview_reset_url.replace("http://localhost:3000", "")}
                      className="button ghost"
                    >
                      Open reset page
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : null}

            <form className="form-grid" onSubmit={handleSubmit}>
              <label className="field">
                <span>Work Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@company.com"
                  required
                />
              </label>

              <div className="auth-actions-row">
                <button className="button primary" type="submit" disabled={loading}>
                  {loading ? "Preparing reset..." : "Send Reset Link"}
                </button>

                <Link href="/login" className="button ghost" style={{ justifyContent: "center" }}>
                  Back to login
                </Link>
              </div>
            </form>
          </div>

          <div className="auth-stage-visual">
            <div className="auth-visual-chip">Account recovery</div>

            <div className="auth-visual-card tall">
              <span>Recovery flow</span>
              <strong>Reset without leaving the workspace</strong>
              <p>Email recovery stays inside the same calm company-safe flow as login and signup.</p>
            </div>

            <div className="auth-visual-card stat">
              <span>Recovery steps</span>
              <strong>02</strong>
              <div className="auth-pill-stack">
                <span>Email verify</span>
                <span>New password</span>
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
                <p>Password recovery stays tied to the same company access structure.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
