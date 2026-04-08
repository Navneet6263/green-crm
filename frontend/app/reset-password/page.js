"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import SiteHeader from "../../components/SiteHeader";
import { apiRequest } from "../../lib/api";

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
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

    setLoading(true);

    try {
      await apiRequest("/auth/reset-password", {
        method: "POST",
        body: {
          token: searchParams.get("token"),
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

      <main className="auth-page">
        <section className="auth-card">
          <span className="eyebrow">Reset Password</span>
          <h1>Choose a new password</h1>
          <p>This page consumes the reset token generated from the forgot password flow.</p>

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

            <button className="button primary" type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="page-shell"><main className="auth-page"><section className="auth-card"><div className="alert">Loading reset form...</div></section></main></div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
