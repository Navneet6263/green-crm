"use client";

import Link from "next/link";
import { useState } from "react";

import AuthShell from "../../components/auth/AuthShell";
import { apiRequest } from "../../lib/api";

const INPUT_CLASS = "w-full rounded-[20px] border border-[#eadfcd] bg-white/90 px-4 py-3.5 text-sm text-[#060710] outline-none transition placeholder:text-[#9c8e76] focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]";
const PRIMARY_BUTTON_CLASS = "inline-flex min-h-[50px] items-center justify-center rounded-[20px] border border-[#10111d] bg-[#10111d] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#1a1c2b] disabled:cursor-not-allowed disabled:opacity-60";
const GHOST_BUTTON_CLASS = "inline-flex min-h-[50px] items-center justify-center rounded-[20px] border border-[#eadfcd] bg-white px-5 py-3 text-sm font-semibold text-[#5d503c] transition hover:-translate-y-0.5 hover:border-[#d7b258] hover:text-[#060710]";

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
      metrics={[
        { label: "Recovery Steps", value: "2", copy: "Verify email and set a new password." },
        { label: "SMTP Ready", value: "Live", copy: "Email delivery works when the backend mail setup is active." },
        { label: "Fallback", value: "Preview", copy: "Local reset preview appears when mail is not configured." },
      ]}
      features={[
        { icon: "security", title: "Safe reset flow", copy: "Recovery stays tied to the same company account used for CRM access.", tone: "bg-[#fff4d9] text-[#8d6e27]" },
        { icon: "message", title: "Email-first delivery", copy: "Reset links are sent to the registered inbox whenever SMTP is active.", tone: "bg-[#f6efe2] text-[#5d503c]" },
        { icon: "dashboard", title: "Back to the right workspace", copy: "After reset, users can return to their CRM dashboard, leads, and task queues quickly.", tone: "bg-[#ebf8ee] text-[#217346]" },
      ]}
    >
      <div className="space-y-5">
        {error ? <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}
        {result ? (
          <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
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
            <span className="text-[10px] font-black uppercase tracking-[0.24em] text-[#9a886d]">Work Email</span>
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
