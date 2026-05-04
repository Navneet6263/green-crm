"use client";
// workflow-tokens.js — shared design system for workflow UI
export const T = {
  panel:  "rounded-2xl border border-slate-100 bg-white shadow-sm",
  kicker: "text-[10px] font-bold uppercase tracking-widest text-slate-400",
  input:  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-50",
  btn:    "inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 transition hover:border-amber-300 hover:text-amber-800 disabled:opacity-50",
  gold:   "inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-[13px] font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50",
};

export const STAGE_DOT = {
  sales:     "bg-amber-400",
  legal:     "bg-violet-400",
  finance:   "bg-orange-400",
  completed: "bg-emerald-500",
};

export const STAGE_PILL = {
  sales:     "border-amber-200 bg-amber-100 text-amber-800",
  legal:     "border-violet-200 bg-violet-100 text-violet-800",
  finance:   "border-orange-200 bg-orange-100 text-orange-800",
  completed: "border-emerald-200 bg-emerald-100 text-emerald-800",
};

export const STATUS_PILL = {
  new:            "border-sky-200 bg-sky-100 text-sky-700",
  contacted:      "border-cyan-200 bg-cyan-100 text-cyan-700",
  qualified:      "border-violet-200 bg-violet-100 text-violet-700",
  proposal:       "border-amber-200 bg-amber-100 text-amber-700",
  negotiation:    "border-orange-200 bg-orange-100 text-orange-700",
  "booked-demo":  "border-violet-200 bg-violet-100 text-violet-700",
  "demo-done":    "border-emerald-200 bg-emerald-100 text-emerald-700",
  "trial-started":"border-blue-200 bg-blue-100 text-blue-700",
  "closed-won":   "border-emerald-200 bg-emerald-100 text-emerald-700",
  "closed-lost":  "border-rose-200 bg-rose-100 text-rose-700",
};

export const PRIORITY_PILL = {
  low:    "border-slate-200 bg-slate-100 text-slate-600",
  medium: "border-amber-200 bg-amber-100 text-amber-700",
  high:   "border-rose-200 bg-rose-100 text-rose-700",
  urgent: "border-rose-300 bg-rose-200 text-rose-900",
};

export function Pill({ label, map, fallback = "border-slate-200 bg-slate-50 text-slate-600" }) {
  const cls = (map?.[label?.toLowerCase?.()] || fallback);
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

export function StageDot({ stage }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${STAGE_DOT[stage] || "bg-slate-300"}`} />;
}
