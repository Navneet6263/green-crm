"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Auto-playing walkthrough of one lead's journey; sample data only.
const STEP_MS = 3400;

const STEPS = [
  { title: "A new lead arrives", desc: "An enquiry is added and lands in the CRM with its source.", action: "new", status: "New", event: { icon: "✨", text: "Lead created from Website enquiry" } },
  { title: "Assigned to the right rep", desc: "The manager picks an owner, so everyone knows who is responsible.", action: "assign", status: "New", event: { icon: "👤", text: "Assigned to Rahul (Sales)" } },
  { title: "Call with one tap", desc: "The call is placed from the lead and logged automatically.", action: "call", status: "Contacted", event: { icon: "📞", text: "Call logged · 4m 12s · Interested" } },
  { title: "Follow-up is scheduled", desc: "The next step gets a date, and a reminder fires before it is due.", action: "follow", status: "Proposal", event: { icon: "⏰", text: "Follow-up set for tomorrow, 11:00 AM" } },
  { title: "Deal won", desc: "One click marks the deal won — and it moves forward on its own.", action: "won", status: "Won", event: { icon: "🎉", text: "Marked Won · ₹2.4L" } },
  { title: "Legal → Finance → Paid", desc: "Legal approves the agreement, finance raises the invoice and records payment.", action: "legal", status: "Completed", event: { icon: "✅", text: "Agreement approved · Invoice paid" } },
];

const ACTIONS = [
  { id: "assign", label: "Assign" },
  { id: "call", label: "📞 Call" },
  { id: "follow", label: "Follow-up" },
  { id: "won", label: "Mark Won" },
  { id: "legal", label: "Send to Legal" },
];

const STATUS_TONE = {
  New: "bg-sky-50 text-sky-700 ring-sky-200",
  Contacted: "bg-amber-50 text-amber-700 ring-amber-200",
  Proposal: "bg-violet-50 text-violet-700 ring-violet-200",
  Won: "bg-brand-50 text-brand-700 ring-brand-200",
  Completed: "bg-gold-50 text-gold-800 ring-gold-300",
};

export default function LiveDemo() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const stageRef = useRef(null);
  const targets = useRef({});

  useEffect(() => {
    if (paused) return undefined;
    const timer = setTimeout(() => setStep((s) => (s + 1) % STEPS.length), STEP_MS);
    return () => clearTimeout(timer);
  }, [step, paused]);

  useLayoutEffect(() => {
    const el = targets.current[STEPS[step].action];
    const stage = stageRef.current;
    if (!el || !stage) return;
    const a = el.getBoundingClientRect();
    const b = stage.getBoundingClientRect();
    setCursor({ x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2 });
  }, [step]);

  const current = STEPS[step];
  const events = STEPS.slice(0, step + 1).map((s) => s.event).reverse();
  const won = step >= 4;

  return (
    <section id="workflow" className="relative scroll-mt-20 overflow-hidden bg-gradient-to-b from-white via-brand-50/50 to-white px-4 py-24 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-gold-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-10 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl" />

      <div className="relative mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[12px] font-bold uppercase tracking-widest text-brand-700 shadow-sm ring-1 ring-brand-100">
            <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" /> Live demo
          </p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">Watch a lead go from enquiry to payment</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">Six steps, one record, no spreadsheets. This is how easy a day in GreenCRM is.</p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          {/* Steps */}
          <ol className="space-y-2">
            {STEPS.map((s, i) => {
              const active = i === step;
              return (
                <li key={s.title}>
                  <button
                    type="button"
                    onClick={() => setStep(i)}
                    className={`group w-full rounded-2xl p-4 text-left transition ${active ? "bg-white shadow-[0_20px_50px_-20px_rgba(12,96,93,0.35)] ring-1 ring-brand-100" : "hover:bg-white/70"}`}
                  >
                    <div className="flex items-start gap-4">
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold transition ${i < step ? "bg-brand-600 text-white" : active ? "bg-gold-400 text-brand-950" : "bg-slate-100 text-slate-400"}`}>
                        {i < step ? "✓" : i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`font-bold ${active ? "text-slate-900" : "text-slate-500"}`}>{s.title}</p>
                        {active ? <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.desc}</p> : null}
                        {active ? (
                          <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-100">
                            <div key={`${step}-${paused}`} className="h-full rounded-full bg-gradient-to-r from-brand-500 to-gold-400" style={{ animation: paused ? "none" : `demoProgress ${STEP_MS}ms linear forwards`, width: paused ? "100%" : undefined }} />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>

          {/* Screen */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-brand-200/50 via-white to-gold-200/50 blur-2xl" />
            <div ref={stageRef} className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_40px_100px_-30px_rgba(12,96,93,0.45)]">
              <div className="flex items-center gap-2 border-b border-slate-100 bg-cream px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-gold-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-brand-400" />
                <span className="ml-3 text-[11px] text-slate-400">GreenCRM · Leads</span>
                <span ref={(el) => { targets.current.new = el; }} className={`ml-auto rounded-full px-3 py-1 text-[11px] font-semibold transition ${step === 0 ? "bg-brand-600 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}>+ New lead</span>
              </div>

              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-bold text-white shadow-lg shadow-brand-600/30">AF</span>
                    <div>
                      <p className="text-lg font-bold text-slate-900">Aarav Foods</p>
                      <p className="text-xs text-slate-500">Mr. Mehta · +91 98xxx xxx10 · Website</p>
                    </div>
                  </div>
                  <span key={current.status} className={`animate-[fadeIn_0.35s_ease_forwards] rounded-full px-3 py-1 text-xs font-bold ring-1 ${STATUS_TONE[current.status]}`}>{current.status}</span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    ["Owner", step >= 1 ? "Rahul" : "—"],
                    ["Value", won ? "₹2.4L" : "₹2.4L est."],
                    ["Next step", step >= 3 ? (step >= 4 ? "Done" : "Tomorrow 11:00") : "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-cream px-2 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{k}</p>
                      <p key={v} className="animate-[fadeIn_0.35s_ease_forwards] text-sm font-bold text-slate-800">{v}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {ACTIONS.map((a) => {
                    const hot = current.action === a.id;
                    return (
                      <span
                        key={a.id}
                        ref={(el) => { targets.current[a.id] = el; }}
                        className={`rounded-xl px-3 py-2 text-xs font-semibold transition duration-300 ${hot ? "scale-105 bg-brand-600 text-white shadow-lg shadow-brand-600/30" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
                      >
                        {a.label}
                      </span>
                    );
                  })}
                </div>

                <div className="mt-5 rounded-2xl border border-slate-100 bg-white">
                  <p className="border-b border-slate-100 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">Activity</p>
                  <ul className="h-[188px] overflow-hidden px-4 py-2">
                    {events.map((e, i) => (
                      <li key={e.text} className={`flex items-center gap-3 py-1.5 ${i === 0 ? "animate-[fadeIn_0.45s_ease_forwards]" : ""}`}>
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm ${i === 0 ? "bg-gold-100" : "bg-cream"}`}>{e.icon}</span>
                        <span className={`text-sm ${i === 0 ? "font-semibold text-slate-900" : "text-slate-500"}`}>{e.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {step === 5 ? (
                  <div className="mt-4 flex animate-[fadeIn_0.4s_ease_forwards] items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-3 text-sm font-semibold text-white">
                    <span>💰</span> Payment received — deal completed
                  </div>
                ) : null}
              </div>

              {/* Fake cursor */}
              <div className="pointer-events-none absolute left-0 top-0 z-20 transition-transform duration-700 ease-out" style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }} aria-hidden="true">
                <span key={step} className="absolute -left-4 -top-4 h-8 w-8 rounded-full bg-gold-400/50" style={{ animation: "demoClick 0.9s ease-out 0.75s both" }} />
                <svg width="22" height="22" viewBox="0 0 24 24" className="drop-shadow-md">
                  <path d="M4 2l16 9-7 2-3 7z" fill="#0f172a" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
