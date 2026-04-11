"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import AuthShell from "../../components/auth/AuthShell";
import { apiRequest } from "../../lib/api";
import { ROLE_HOME_ROUTE } from "../../lib/roles";
import { saveSession } from "../../lib/session";

const INPUT_CLASS = "w-full rounded-[20px] border border-[#eadfcd] bg-white/90 px-4 py-3.5 text-sm text-[#060710] outline-none transition placeholder:text-[#9c8e76] focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]";
const PRIMARY_BUTTON_CLASS = "inline-flex min-h-[50px] items-center justify-center rounded-[20px] border border-[#10111d] bg-[#10111d] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#1a1c2b] disabled:cursor-not-allowed disabled:opacity-60";
const GHOST_BUTTON_CLASS = "inline-flex min-h-[50px] items-center justify-center rounded-[20px] border border-[#eadfcd] bg-white px-5 py-3 text-sm font-semibold text-[#5d503c] transition hover:-translate-y-0.5 hover:border-[#d7b258] hover:text-[#060710]";

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
    <AuthShell
      modeLabel="Login"
      switchText="New workspace?"
      switchHref="/register"
      switchLabel="Sign up"
      title="Open your company workspace"
      description="Login with your GreenCRM email and password to enter the dashboard designed for your role."
      sideEyebrow="Access Layer"
      sideTitle="Access your GreenCRM workspace and continue daily CRM work from one account."
      sideCopy="Open leads, customers, tasks, analytics, reminders, and workflow queues with the same role-based access used across your company."
      metrics={[
        { label: "Role Views", value: "7", copy: "Admin, manager, sales, marketing, support, legal, and finance." },
        { label: "Secure", value: "100%", copy: "Session-based access with company-scoped workspace routing." },
        { label: "Fast Entry", value: "< 1m", copy: "Sign in and land directly on the right dashboard." },
      ]}
      features={[
        { icon: "dashboard", title: "Role-based access", copy: "Every account lands in the right CRM dashboard without extra routing steps.", tone: "bg-[#fff4d9] text-[#8d6e27]" },
        { icon: "workflow", title: "Leads and workflow stay connected", copy: "Lead movement, tasks, reminders, and handoff stages remain visible after login.", tone: "bg-[#f6efe2] text-[#5d503c]" },
        { icon: "security", title: "Recovery stays available", copy: "Password reset and secure access remain tied to the same company CRM account.", tone: "bg-[#ebf8ee] text-[#217346]" },
      ]}
    >
      <div className="space-y-5">
        {error ? <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.24em] text-[#9a886d]">Work Email</span>
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
              <span className="text-[10px] font-black uppercase tracking-[0.24em] text-[#9a886d]">Password</span>
              <Link href="/forgot-password" className="text-xs font-semibold text-[#8d6e27] hover:text-[#060710]">
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
      </div>
    </AuthShell>
  );
}
