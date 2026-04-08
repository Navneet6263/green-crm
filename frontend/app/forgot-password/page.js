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

      <main className="auth-page">
        <section className="auth-card">
          <span className="eyebrow">Forgot Password</span>
          <h1>Reset access for your workspace</h1>
          <p>Enter the email used in GreenCRM. If SMTP is configured, the reset link goes to the inbox. If mail is not configured yet, this screen shows a preview link for local testing.</p>

          {error ? <div className="alert error">{error}</div> : null}
          {result ? (
            <div className="alert">
              <strong>{result.message}</strong>
              {result.delivery === "email" ? (
                <div style={{ marginTop: "0.75rem" }}>Reset link sent to the registered email address.</div>
              ) : null}
              {result.preview_reset_url ? (
                <div style={{ marginTop: "0.75rem" }}>
                  <Link href={result.preview_reset_url.replace("http://localhost:3000", "")}>Open reset page</Link>
                </div>
              ) : null}
            </div>
          ) : null}

          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@company.com"
                required
              />
            </label>

            <button className="button primary" type="submit" disabled={loading}>
              {loading ? "Preparing reset..." : "Send reset link"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
