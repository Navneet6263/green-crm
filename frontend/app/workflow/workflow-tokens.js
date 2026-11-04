"use client";
// workflow-tokens.js — shared design system for workflow UI
export const T = {
  panel:  "rounded-[14px] bg-white ring-1 ring-slate-200",
  kicker: "text-[11.5px] font-semibold text-slate-500",
  input:  "w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-[13.5px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-50",
  btn:    "inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-white px-3 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50",
  gold:   "inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-brand-700 px-3.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:opacity-50",
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
