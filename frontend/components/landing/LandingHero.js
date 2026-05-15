import Link from "next/link";
import { btnPrimary, btnSecondary } from "./landing-styles";

const FLOW = ["New Lead", "Call", "Notes", "Follow-up", "Converted"];
const STATS = [
  { value: "10,000+", label: "Leads Managed" },
  { value: "500+", label: "Sales Teams" },
  { value: "99.9%", label: "Uptime" },
];

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.08),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(99,102,241,0.06),transparent_50%)]" />
      <div className="absolute top-20 right-10 h-72 w-72 rounded-full bg-emerald-200/20 blur-3xl" />
      <div className="absolute bottom-10 left-10 h-60 w-60 rounded-full bg-indigo-200/20 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pb-28 lg:pt-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left — Copy */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-[12px] font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              #1 Sales CRM for Indian Businesses
            </span>

            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.5rem] lg:leading-[1.1]">
              Stop losing leads.<br />
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Start closing deals.</span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-600">
              GreenCRM helps businesses manage leads, follow-ups, calling, notes, WhatsApp communication, attendance, and sales tracking — all in one place.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/book-demo" className={btnPrimary}>Book Free Demo →</Link>
              <Link href="#features" className={btnSecondary}>See Features</Link>
            </div>

            {/* Stats */}
            <div className="mt-10 flex gap-8">
              {STATS.map(s => (
                <div key={s.label}>
                  <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                  <p className="text-sm text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Animated Workflow */}
          <div className="relative">
            <div className="rounded-2xl border border-slate-100 bg-white/70 backdrop-blur-sm p-8 shadow-2xl shadow-slate-200/50">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-5">Live Lead Flow</p>
              <div className="flex flex-col gap-3">
                {FLOW.map((step, i) => (
                  <div key={step} className="flex items-center gap-3 animate-[fadeIn_0.5s_ease_forwards] opacity-0" style={{ animationDelay: `${i * 0.3}s`, animationFillMode: "forwards" }}>
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-bold text-white ${i === FLOW.length - 1 ? "bg-emerald-600" : "bg-slate-800"}`}>{i + 1}</span>
                    <div className="flex-1 rounded-lg bg-slate-50 px-4 py-2.5">
                      <p className="text-sm font-semibold text-slate-800">{step}</p>
                    </div>
                    {i < FLOW.length - 1 ? <span className="text-slate-300">→</span> : <span className="text-emerald-600 font-bold">✓</span>}
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <p className="text-sm font-medium text-emerald-700">Lead converted in 5 steps — zero manual tracking</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
