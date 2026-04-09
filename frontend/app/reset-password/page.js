"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import SiteHeader from "../../components/SiteHeader";
import { apiRequest } from "../../lib/api";

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!token) {
      setError("Reset link is missing or expired.");
      return;
    }

    setLoading(true);

    try {
      await apiRequest("/auth/reset-password", {
        method: "POST",
        body: {
          token,
          new_password: password,
        },
      });
      setSuccess(true);
      setTimeout(() => router.push("/login"), 1200);
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
              <span className="eyebrow">Reset Password</span>
              <div className="auth-stage-switch">
                <span>Back to workspace access?</span>
                <Link href="/login">Login</Link>
              </div>
            </div>

            <div className="auth-copy-block">
              <h1>Choose a new password</h1>
              <p>Set a fresh password for the same company workspace and return to login in one step.</p>
            </div>

            {!token ? (
              <div className="alert error">Reset link is missing or expired.</div>
            ) : null}
            {error ? <div className="alert error">{error}</div> : null}
            {success ? <div className="alert">Password updated. Redirecting to login...</div> : null}

            <form className="form-grid" onSubmit={handleSubmit}>
              <label className="field">
                <span>New Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </label>

              <label className="field">
                <span>Confirm Password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </label>

              <div className="auth-actions-row">
                <button className="button primary" type="submit" disabled={loading || !token}>
                  {loading ? "Updating..." : "Update Password"}
                </button>

                <Link href="/login" className="button ghost" style={{ justifyContent: "center" }}>
                  Back to login
                </Link>
              </div>
            </form>
          </div>

          <div className="auth-stage-visual">
            <div className="auth-visual-chip">Secure reset</div>

            <div className="auth-visual-card tall">
              <span>Fresh access</span>
              <strong>Set a clean password and continue</strong>
              <p>The reset step stays aligned with the same sky-blue login and signup experience.</p>
            </div>

            <div className="auth-visual-card stat">
              <span>Final step</span>
              <strong>01</strong>
              <div className="auth-pill-stack">
                <span>New password</span>
                <span>Login ready</span>
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
                <p>Access resets stay clean, direct, and tied to the right tenant workspace.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="page-shell">
          <SiteHeader compact />
          <main className="auth-page auth-sky-page">
            <section className="auth-card">
              <div className="alert">Loading reset form...</div>
            </section>
          </main>
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
