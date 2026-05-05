"use client";

export const T = {
  panel:  "rounded-2xl border border-slate-100 bg-white shadow-sm",
  kicker: "text-[10px] font-bold uppercase tracking-widest text-slate-400",
  input:  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-50",
  gold:   "inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-[13px] font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50",
  ghost:  "inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-50",
};

export const TYPE_CFG = {
  call:     { icon: "📞", bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
  whatsapp: { icon: "💬", bg: "bg-green-100",   text: "text-green-700",   border: "border-green-200"   },
  email:    { icon: "✉️",  bg: "bg-sky-100",     text: "text-sky-700",     border: "border-sky-200"     },
  meeting:  { icon: "🤝", bg: "bg-violet-100",  text: "text-violet-700",  border: "border-violet-200"  },
  demo:     { icon: "🖥️", bg: "bg-amber-100",   text: "text-amber-700",   border: "border-amber-200"   },
  reminder: { icon: "🔔", bg: "bg-orange-100",  text: "text-orange-700",  border: "border-orange-200"  },
  task:     { icon: "✅", bg: "bg-slate-100",   text: "text-slate-600",   border: "border-slate-200"   },
  note:     { icon: "📝", bg: "bg-yellow-100",  text: "text-yellow-700",  border: "border-yellow-200"  },
  comment:  { icon: "💭", bg: "bg-cyan-100",    text: "text-cyan-700",    border: "border-cyan-200"    },
};

export const PRIORITY_CFG = {
  low:    "border-sky-200 bg-sky-100 text-sky-700",
  medium: "border-amber-200 bg-amber-100 text-amber-800",
  high:   "border-rose-200 bg-rose-100 text-rose-700",
  urgent: "border-rose-300 bg-rose-200 text-rose-900",
};

export const STATUS_CFG = {
  pending:     "border-amber-200 bg-amber-100 text-amber-800",
  "in-progress":"border-sky-200 bg-sky-100 text-sky-700",
  done:        "border-emerald-200 bg-emerald-100 text-emerald-700",
  cancelled:   "border-slate-200 bg-slate-100 text-slate-500",
};

export function nice(v = "") {
  return String(v).split("-").filter(Boolean).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

export function typeCfg(type) {
  return TYPE_CFG[String(type||"task").toLowerCase()] || TYPE_CFG.task;
}
