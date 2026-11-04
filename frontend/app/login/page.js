"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import AuthShell from "../../components/auth/AuthShell";
import { AUTH_INPUT_CLASS as INPUT_CLASS, AUTH_PRIMARY_BUTTON_CLASS as PRIMARY_BUTTON_CLASS, AUTH_GHOST_BUTTON_CLASS as GHOST_BUTTON_CLASS } from "../../components/auth/authStyles";
import { apiRequest } from "../../lib/api";
import { ROLE_HOME_ROUTE } from "../../lib/roles";
import { saveSession } from "../../lib/session";
import LoginCodeStep from "./LoginCodeStep";

// The page to open after login (from ?next=), only if it is a page inside this app.
function safeNext() {
  if (typeof window === "undefined") return "";
  const next = new URLSearchParams(window.location.search).get("next") || "";
  return /^\/(?!\/)[^\s\\]*$/.test(next) && !next.startsWith("/login") ? next : "";
}

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Set when the server asks for the monthly email code: { challenge_id, email_hint }.
  const [challenge, setChallenge] = useState(null);

  function finish(session) {
    saveSession(session);
    const role = session?.user?.role || "";
    router.push(safeNext() || ROLE_HOME_ROUTE[role] || "/dashboard");
  }

  async function signIn() {
    const result = await apiRequest("/auth/login", { method: "POST", body: { ...form, email_otp: true } });
    if (result?.otp_required) setChallenge(result);
    else finish(result);
  }

  async function run(action) {
    setLoading(true);
    setError("");
    try {
      await action();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    run(signIn);
  }

  const verifyCode = (code) => run(async () => finish(await apiRequest("/auth/login/verify-code", { method: "POST", body: { challenge_id: challenge.challenge_id, code } })));
  const backToPassword = () => { setChallenge(null); setError(""); setForm((current) => ({ ...current, password: "" })); };

  return (
    <AuthShell
      modeLabel="Login"
      switchText="New workspace?"
      switchHref="/register"
      switchLabel="Sign up"
      title={challenge ? "Check your email" : "Welcome back"}
      description={challenge ? "Enter the code we just sent to finish signing in." : "Log in with your work email to open the dashboard for your role."}
      sideEyebrow="GreenCRM workspace"
      sideTitle="Your whole sales day, one login away."
      sideCopy="Leads, follow-ups, tasks and team activity — right where you left them."
      features={[
        { icon: "dashboard", title: "Role-based access", copy: "Every account lands in the right CRM dashboard without extra routing steps.", tone: "bg-gold-50 text-brand-700" },
        { icon: "workflow", title: "Leads and workflow stay connected", copy: "Lead movement, tasks, reminders, and handoff stages remain visible after login.", tone: "bg-cream text-slate-600" },
        { icon: "security", title: "Recovery stays available", copy: "Password reset and secure access remain tied to the same company CRM account.", tone: "bg-brand-50 text-brand-700" },
      ]}
    >
      <div className="space-y-5">
        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}

        {challenge ? (
          <LoginCodeStep emailHint={challenge.email_hint} loading={loading} onVerify={verifyCode} onResend={() => run(signIn)} onBack={backToPassword} />
        ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-xs font-semibold text-slate-600">Work Email</span>
            <input
              className={INPUT_CLASS}
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="owner@company.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="block space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-slate-600">Password</span>
              <Link href="/forgot-password" className="text-xs font-semibold text-brand-700 hover:text-brand-800">
                Forgot password?
              </Link>
            </div>
            <input
              className={INPUT_CLASS}
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Enter password"
              autoComplete="current-password"
              required
            />
          </label>

          <div className="grid gap-3 pt-2 sm:grid-cols-2">
            <button className={PRIMARY_BUTTON_CLASS} type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </button>
            <Link href="/register" className={GHOST_BUTTON_CLASS}>
              Create Workspace
            </Link>
          </div>
        </form>
        )}
      </div>
    </AuthShell>
  );
}
