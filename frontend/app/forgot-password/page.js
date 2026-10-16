"use client";

import Link from "next/link";
import { useState } from "react";

import AuthShell from "../../components/auth/AuthShell";
import { AUTH_INPUT_CLASS as INPUT_CLASS, AUTH_PRIMARY_BUTTON_CLASS as PRIMARY_BUTTON_CLASS, AUTH_GHOST_BUTTON_CLASS as GHOST_BUTTON_CLASS } from "../../components/auth/authStyles";
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
    <AuthShell
      modeLabel="Forgot Password"
      switchText="Remember your password?"
      switchHref="/login"
      switchLabel="Login"
      title="Reset your company access"
      description="Enter the email used in GreenCRM. If SMTP is active, the reset link goes to the inbox. If mail is not configured yet, a local preview link appears here."
      sideEyebrow="Recovery Flow"
      sideTitle="Recover access to your GreenCRM workspace without losing CRM continuity."
      sideCopy="Reset the account that manages leads, customers, tasks, reminders, and workflow activity inside your company workspace."
      features={[
        { icon: "security", title: "Safe reset flow", copy: "Recovery stays tied to the same company account used for CRM access.", tone: "bg-gold-50 text-brand-700" },
        { icon: "message", title: "Email-first delivery", copy: "Reset links are sent to the registered inbox whenever SMTP is active.", tone: "bg-cream text-slate-600" },
        { icon: "dashboard", title: "Back to the right workspace", copy: "After reset, users can return to their CRM dashboard, leads, and task queues quickly.", tone: "bg-brand-50 text-brand-700" },
      ]}
    >
      <div className="space-y-5">
        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}
        {result ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
            <strong className="block font-semibold">{result.message}</strong>
            {result.delivery === "email" ? <p className="mt-2">Reset link sent to the registered email address.</p> : null}
            {result.preview_reset_url ? (
              <div className="mt-4">
                <Link
                  href={result.preview_reset_url.replace("http://localhost:3000", "")}
                  className={GHOST_BUTTON_CLASS}
                >
                  Open reset page
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-xs font-semibold text-slate-600">Work Email</span>
            <input
              className={INPUT_CLASS}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@company.com"
              autoComplete="email"
              required
            />
          </label>

          <div className="grid gap-3 pt-2 sm:grid-cols-2">
            <button className={PRIMARY_BUTTON_CLASS} type="submit" disabled={loading}>
              {loading ? "Preparing reset..." : "Send Reset Link"}
            </button>
            <Link href="/login" className={GHOST_BUTTON_CLASS}>
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </AuthShell>
  );
}
