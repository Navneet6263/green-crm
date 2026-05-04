"use client";

export const T = {
  panel:  "rounded-2xl border border-slate-100 bg-white shadow-sm",
  soft:   "rounded-xl border border-amber-100 bg-amber-50/60",
  input:  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-50",
  kicker: "text-[10px] font-bold uppercase tracking-widest text-slate-400",
  gold:   "inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-[13px] font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed",
  ghost:  "inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed",
  danger: "inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-[12px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed",
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

export function StatCard({ label, value, accent }) {
  return (
    <div className={`rounded-2xl border px-4 py-3.5 ${accent || "border-slate-200 bg-slate-100"}`}>
      <p className={T.kicker}>{label}</p>
      <p className="mt-1 text-2xl font-bold leading-none text-slate-900">{value}</p>
    </div>
  );
}
