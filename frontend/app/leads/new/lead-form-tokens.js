"use client";

export const T = {
  panel:  "rounded-2xl border border-slate-100 bg-white shadow-sm",
  input:  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-50 disabled:bg-slate-50 disabled:text-slate-400",
  kicker: "text-[10px] font-bold uppercase tracking-widest text-slate-400",
  gold:   "inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed",
  ghost:  "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-50",
};

export function Label({ label, error, hint, span, fieldId, children }) {
  return (
    <label id={fieldId ? `field-${fieldId}` : undefined} className={`block space-y-1.5 ${span || ""}`}>
      <span className={T.kicker}>{label}</span>
      {children}
      {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
      {hint && !error ? <p className="text-xs text-slate-400">{hint}</p> : null}
    </label>
  );
}

export function SectionCard({ step, title, sub, children, cols = "sm:grid-cols-2" }) {
  return (
    <div className={T.panel + " px-5 py-5"}>
      <div className="mb-5 flex items-center gap-3 border-b border-slate-50 pb-4">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-amber-200 bg-amber-50 text-xs font-bold text-amber-700">{step}</span>
        <div>
          <p className="text-sm font-bold text-slate-900">{title}</p>
          {sub ? <p className="text-xs text-slate-400">{sub}</p> : null}
        </div>
      </div>
      <div className={`grid gap-4 ${cols}`}>{children}</div>
    </div>
  );
}
