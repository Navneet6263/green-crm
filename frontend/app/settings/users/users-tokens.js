"use client";

import { formatIndiaDateTime } from "../../../lib/dateTime";

export const T = {
  panel:  "rounded-2xl border border-slate-100 bg-white shadow-sm",
  input:  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-50",
  kicker: "text-[10px] font-bold uppercase tracking-widest text-slate-400",
  gold:   "inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed",
  ghost:  "inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed",
  danger: "inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed",
};

export const ROLE_COLORS = {
  admin:         "border-violet-200 bg-violet-100 text-violet-700",
  manager:       "border-amber-200 bg-amber-100 text-amber-800",
  sales:         "border-emerald-200 bg-emerald-100 text-emerald-700",
  marketing:     "border-sky-200 bg-sky-100 text-sky-700",
  support:       "border-cyan-200 bg-cyan-100 text-cyan-700",
  "legal-team":  "border-orange-200 bg-orange-100 text-orange-700",
  "finance-team":"border-blue-200 bg-blue-100 text-blue-700",
  viewer:        "border-slate-200 bg-slate-100 text-slate-600",
};

export const AVATAR_BG = {
  admin:         "bg-violet-600",
  manager:       "bg-amber-600",
  sales:         "bg-emerald-600",
  marketing:     "bg-sky-600",
  support:       "bg-cyan-600",
  "legal-team":  "bg-orange-600",
  "finance-team":"bg-blue-600",
  viewer:        "bg-slate-500",
};

export function pretty(v = "") {
  return String(v).replaceAll("_", "-").split("-").filter(Boolean).map(x => x[0].toUpperCase() + x.slice(1)).join(" ");
}

export function initials(v = "TM") {
  return String(v).split(" ").filter(Boolean).slice(0, 2).map(x => x[0]?.toUpperCase() || "").join("") || "TM";
}

export function when(v, full = false) { return formatIndiaDateTime(v, full); }

export function credentialState(user) {
  if (user?.last_login_at) return { label: "Signed in",      tone: "border-emerald-200 bg-emerald-100 text-emerald-700" };
  if (user?.is_temporary_password) return { label: "Pending login", tone: "border-amber-200 bg-amber-100 text-amber-700" };
  return { label: "Access created", tone: "border-slate-200 bg-slate-100 text-slate-600" };
}

export function Avatar({ name, role, size = "h-10 w-10", text = "text-sm" }) {
  const bg = AVATAR_BG[role] || "bg-slate-500";
  return (
    <div className={`grid ${size} shrink-0 place-items-center rounded-xl ${bg} ${text} font-bold text-white`}>
      {initials(name)}
    </div>
  );
}

export function RolePill({ role }) {
  const cls = ROLE_COLORS[role] || "border-slate-200 bg-slate-50 text-slate-600";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {pretty(role)}
    </span>
  );
}
