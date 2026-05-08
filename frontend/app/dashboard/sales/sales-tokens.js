"use client";

import Link from "next/link";
import DashboardIcon from "../../../components/dashboard/icons";

export const T = {
  panel: "rounded-2xl border border-slate-100 bg-white shadow-sm",
  K: "text-[10px] font-bold uppercase tracking-widest text-slate-400",
};

export function fmtCompact(v) {
  const n = Number(v || 0);
  return new Intl.NumberFormat("en-IN", { notation: n >= 1000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n);
}
export function fmtCurrency(v) { return `₹${Number(v || 0).toLocaleString("en-IN")}`; }
export function fmtDate(v, withTime = false) {
  if (!v) return "--";
  const d = new Date(v);
  if (isNaN(d)) return "--";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) });
}
export function titleize(v = "") { return String(v).replaceAll("_", "-").split("-").filter(Boolean).map(p => p[0].toUpperCase() + p.slice(1)).join(" "); }
export function initials(v = "?") { return String(v).split(" ").filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() || "").join("") || "?"; }

export function StatCard({ label, value, hint, accent }) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl border px-4 py-3.5 transition hover:shadow-sm ${accent || "border-slate-100 bg-white"}`}>
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
      <p className={T.K}>{label}</p>
      <p className="mt-1 text-xl font-bold leading-none text-slate-900">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  );
}

export function QuickLink({ href, icon, label }) {
  return (
    <Link href={href} prefetch={false}
      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:text-amber-800">
      <DashboardIcon name={icon} className="h-4 w-4" />
      {label}
    </Link>
  );
}
