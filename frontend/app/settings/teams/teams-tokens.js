"use client";

export const T = {
  panel:  "rounded-[14px] bg-white ring-1 ring-slate-200",
  soft:   "rounded-[12px] bg-slate-50 ring-1 ring-slate-100",
  input:  "w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-[13.5px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-50",
  kicker: "text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400",
  gold:   "inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-brand-700 px-3.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50",
  ghost:  "inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-white px-3 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50",
  danger: "inline-flex h-8 items-center justify-center gap-1.5 rounded-[8px] bg-white px-2.5 text-[12px] font-semibold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50",
};

export function prettyRole(v = "") {
  return String(v).split("-").filter(Boolean).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

export function initials(v = "TM") {
  return String(v).split(" ").filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() || "").join("") || "TM";
}

export function Avatar({ name, size = "h-9 w-9", bg = "bg-emerald-600" }) {
  return (
    <div className={`grid ${size} shrink-0 place-items-center rounded-xl ${bg} text-xs font-bold text-white`}>
      {initials(name)}
    </div>
  );
}

const ACCENT = { amber: "#b98300", emerald: "#059669", sky: "#3b6fd8", violet: "#8a55e6", rose: "#e11d48", slate: "#64748b" };

export function StatCard({ label, value, accent }) {
  const color = ACCENT[/(amber|emerald|sky|violet|rose|slate)/.exec(accent || "")?.[1] || "slate"];
  return (
    <div className="relative overflow-hidden rounded-[12px] bg-white px-4 py-3.5 ring-1 ring-slate-200">
      <p className="text-[12px] font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-[22px] font-bold leading-none tabular-nums text-slate-900">{value}</p>
      <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full" style={{ background: color }} aria-hidden="true" />
    </div>
  );
}
