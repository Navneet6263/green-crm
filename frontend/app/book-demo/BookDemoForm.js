"use client";

import { useState } from "react";
import Link from "next/link";
import { apiRequest } from "../../lib/api";
import { COMPANY } from "../../components/landing/landing-data";

const I = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-50";
const L = "text-xs font-semibold text-slate-600";
const SIZES = ["1-5", "6-20", "21-50", "51-200", "200+"];

export default function BookDemoForm() {
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", company_size: "", demo_date: "", demo_time: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault(); setLoading(true); setError("");
    try {
      await apiRequest("/demo-requests", { method: "POST", body: { ...form, demo_date: form.demo_date && form.demo_time ? `${form.demo_date} ${form.demo_time}:00` : form.demo_date || undefined } });
      setDone(true);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-brand-200/60 via-white to-gold-200/60 blur-2xl" />
      <div className="relative overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-[0_40px_100px_-30px_rgba(12,96,93,0.45)]">
        <div className="h-1.5 bg-gradient-to-r from-brand-700 via-gold-400 to-brand-500" />

        {done ? (
          <div className="px-6 py-16 text-center sm:px-10">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-3xl text-white shadow-lg shadow-brand-600/30">✓</div>
            <h2 className="mt-6 text-2xl font-extrabold text-slate-900">Demo request received!</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">Thank you, {form.name.split(" ")[0] || "there"}. Our team will contact you shortly to confirm the time.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/" className="rounded-full bg-gradient-to-r from-brand-700 to-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/20">Back to Home</Link>
              <a href={COMPANY.whatsappHref} target="_blank" rel="noopener noreferrer" className="rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700">WhatsApp Us</a>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5 px-6 py-8 sm:px-8">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Schedule your free demo</h2>
              <p className="mt-1 text-sm text-slate-500">Takes under a minute. We will set it up around your team.</p>
            </div>

            {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</div> : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5"><span className={L}>Full name *</span><input className={I} value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="Your name" /></label>
              <label className="space-y-1.5"><span className={L}>Company name *</span><input className={I} value={form.company} onChange={(e) => set("company", e.target.value)} required placeholder="Company" /></label>
              <label className="space-y-1.5"><span className={L}>Work email *</span><input className={I} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required placeholder="you@company.com" /></label>
              <label className="space-y-1.5"><span className={L}>Phone *</span><input className={I} value={form.phone} onChange={(e) => set("phone", e.target.value)} required placeholder="+91 98765 43210" /></label>
            </div>

            <div className="space-y-2">
              <span className={L}>Team size</span>
              <div className="flex flex-wrap gap-2">
                {SIZES.map((s) => {
                  const on = form.company_size === s;
                  return (
                    <button key={s} type="button" onClick={() => set("company_size", on ? "" : s)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${on ? "bg-brand-600 text-white shadow-md shadow-brand-600/20" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-brand-300"}`}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5"><span className={L}>Preferred date</span><input className={I} type="date" value={form.demo_date} onChange={(e) => set("demo_date", e.target.value)} min={new Date().toISOString().slice(0, 10)} /></label>
              <label className="space-y-1.5"><span className={L}>Preferred time</span><input className={I} type="time" value={form.demo_time} onChange={(e) => set("demo_time", e.target.value)} /></label>
            </div>

            <label className="block space-y-1.5">
              <span className={L}>What would you like to see?</span>
              <textarea className={`${I} min-h-[90px] resize-y`} value={form.message} onChange={(e) => set("message", e.target.value)} placeholder="E.g. lead management, WhatsApp, calling, field tracking, attendance…" />
            </label>

            <button type="submit" disabled={loading} className="w-full rounded-full bg-gradient-to-r from-brand-700 to-brand-500 py-3.5 text-sm font-bold text-white shadow-xl shadow-brand-600/25 transition hover:-translate-y-0.5 disabled:opacity-50">
              {loading ? "Booking…" : "Book My Free Demo →"}
            </button>
            <p className="text-center text-xs text-slate-400">No spam. We only contact you to schedule the demo.</p>
          </form>
        )}
      </div>
    </div>
  );
}
