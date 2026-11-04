"use client";

import { useEffect, useRef, useState } from "react";
import { AUTH_GHOST_BUTTON_CLASS as GHOST_BUTTON_CLASS, AUTH_PRIMARY_BUTTON_CLASS as PRIMARY_BUTTON_CLASS } from "../../components/auth/authStyles";

const RESEND_SECONDS = 30;

/** Second login step: the 6-digit code we emailed. Once a month, to confirm the email is real. */
export default function LoginCodeStep({ emailHint, loading, onVerify, onResend, onBack }) {
  const [code, setCode] = useState("");
  const [wait, setWait] = useState(RESEND_SECONDS);
  const input = useRef(null);

  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => {
    if (wait <= 0) return undefined;
    const timer = setTimeout(() => setWait((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const submit = (event) => { event.preventDefault(); if (code.length === 6) onVerify(code); };
  const change = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6 && !loading) onVerify(digits);
  };
  const resend = async () => { setCode(""); setWait(RESEND_SECONDS); await onResend(); input.current?.focus(); };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-sm text-slate-700">
        We sent a 6-digit code to <b className="font-semibold text-slate-900">{emailHint}</b>. We ask once a month so your reminders reach the right inbox.
      </div>
      <label className="block space-y-2">
        <span className="text-xs font-semibold text-slate-600">Code from your email</span>
        <input ref={input} value={code} onChange={(e) => change(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" aria-label="6-digit code"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.5em] text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-brand-400 focus:ring-4 focus:ring-brand-50" />
      </label>
      <div className="grid gap-3 pt-1 sm:grid-cols-2">
        <button className={PRIMARY_BUTTON_CLASS} type="submit" disabled={loading || code.length !== 6}>{loading ? "Checking..." : "Verify and sign in"}</button>
        <button className={GHOST_BUTTON_CLASS} type="button" onClick={onBack} disabled={loading}>Use another account</button>
      </div>
      <p className="text-center text-xs text-slate-500">
        No email? Check spam, or{" "}
        {wait > 0 ? <span>send again in {wait}s</span> : <button type="button" onClick={resend} disabled={loading} className="font-semibold text-brand-700 hover:text-brand-800">send a new code</button>}
      </p>
    </form>
  );
}
