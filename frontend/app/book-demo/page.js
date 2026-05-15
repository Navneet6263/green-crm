"use client";

import { useState } from "react";
import Link from "next/link";
import { apiRequest } from "../../lib/api";

const I = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50";
const SIZES = ["1-5", "6-20", "21-50", "51-200", "200+"];

export default function BookDemoPage() {
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", company_size: "", demo_date: "", demo_time: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault(); setLoading(true); setError("");
    try {
      await apiRequest("/demo-requests", { method: "POST", body: { ...form, demo_date: form.demo_date && form.demo_time ? `${form.demo_date} ${form.demo_time}:00` : form.demo_date || undefined } });
      setDone(true);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  if (done) return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50/30 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-emerald-100 text-emerald-600">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Demo Booked!</h1>
        <p className="mt-2 text-sm text-slate-500">Our team will contact you shortly to confirm the schedule.</p>
        <Link href="/" className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition">Back to Home</Link>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30">
      {/* Left — Branding */}
      <div className="hidden lg:flex lg:w-[42%] flex-col justify-between bg-slate-900 px-10 py-10 text-white">
        <div>
          <Link href="/" className="text-xl font-bold">GreenCRM</Link>
          <h2 className="mt-12 text-3xl font-bold leading-tight">See how GreenCRM fits<br />your business in 30 min</h2>
          <p className="mt-4 text-sm text-slate-300 leading-relaxed max-w-sm">Lead management, calling, WhatsApp, SMS, attendance, and dashboards — all in one setup. No credit card needed.</p>
        </div>
        <div className="space-y-3">
          {["Live product walkthrough", "Custom setup for your team", "Q&A with product expert"].map(t => (
            <div key={t} className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-md bg-emerald-500/20 text-emerald-400 text-xs">✓</span><span className="text-sm text-slate-300">{t}</span></div>
          ))}
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-lg">

          <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600">Book Free Demo</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Schedule your demo</h1>
          <p className="mt-1 text-sm text-slate-500">Fill in your details and we'll set up a personalized walkthrough.</p>

          {error ? <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</div> : null}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-600">Full Name *</span>
                <input className={I} value={form.name} onChange={e => set("name", e.target.value)} required placeholder="John Doe" />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-600">Company Name *</span>
                <input className={I} value={form.company} onChange={e => set("company", e.target.value)} required placeholder="Acme Inc" />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-600">Work Email *</span>
                <input className={I} type="email" value={form.email} onChange={e => set("email", e.target.value)} required placeholder="you@company.com" />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-600">Phone *</span>
                <input className={I} value={form.phone} onChange={e => set("phone", e.target.value)} required placeholder="+91 98765 43210" />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-600">Company Size</span>
                <select className={I} value={form.company_size} onChange={e => set("company_size", e.target.value)}>
                  <option value="">Select</option>
                  {SIZES.map(s => <option key={s} value={s}>{s} people</option>)}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-600">Preferred Demo Date</span>
                <input className={I} type="date" value={form.demo_date} onChange={e => set("demo_date", e.target.value)} min={new Date().toISOString().slice(0, 10)} />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-600">Preferred Time</span>
                <input className={I} type="time" value={form.demo_time} onChange={e => set("demo_time", e.target.value)} />
              </label>
            </div>
            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-600">What do you need from us?</span>
              <textarea className={`${I} min-h-[90px] resize-y`} value={form.message} onChange={e => set("message", e.target.value)} placeholder="E.g. Lead management, WhatsApp integration, calling, team tracking, attendance…" />
            </label>
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-500/20">
              {loading ? "Submitting…" : "Book My Free Demo →"}
            </button>
            <p className="text-center text-[11px] text-slate-400">No spam. We'll only reach out to schedule your demo.</p>
          </form>
        </div>
      </div>
    </div>
  );
}
