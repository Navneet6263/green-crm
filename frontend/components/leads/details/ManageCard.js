"use client";

// Shared look for the cards on a lead's Manage tab: an icon, a title, one line on what it is for.
export const MANAGE_ICONS = {
  owner: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20c.9-3.4 4-5.5 8-5.5s7.1 2.1 8 5.5",
  legal: "M12 3v18M5 7h14M7 7l-3 7a3 3 0 0 0 6 0L7 7Zm10 0-3 7a3 3 0 0 0 6 0l-3-7Z",
  record: "M6 3h9l4 4v14H6V3Zm8 0v5h5M9 12h7M9 16h5",
  archive: "M4 5h16v4H4V5Zm1 4h14v10H5V9Zm5 4h4",
  transfer: "M7 7h12l-3-3M17 17H5l3 3",
};

export const FIELD = "w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-50";
export const FIELD_LABEL = "mb-1 block text-[12px] font-semibold text-slate-600";
export const PRIMARY_BTN = "inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-brand-700 px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50";
export const GHOST_BTN = "inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-white px-3.5 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50";

const TONES = {
  brand: "bg-brand-50 text-brand-700",
  gold: "bg-gold-50 text-gold-800",
  slate: "bg-slate-100 text-slate-600",
  rose: "bg-rose-50 text-rose-600",
  emerald: "bg-emerald-50 text-emerald-700",
};

export function ManageIcon({ name, className = "h-4 w-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={MANAGE_ICONS[name]} />
    </svg>
  );
}

export default function ManageCard({ icon, tone = "brand", title, subtitle, badge, danger = false, children, footer }) {
  return (
    <section className={`min-w-0 overflow-hidden rounded-[14px] bg-white ring-1 ${danger ? "ring-rose-200" : "ring-slate-200"}`}>
      <header className="flex items-start gap-3 border-b border-slate-100 px-4 py-3">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-[9px] ${TONES[tone] || TONES.brand}`}><ManageIcon name={icon} /></span>
        <div className="min-w-0 flex-1">
          <h4 className="text-[14px] font-bold leading-tight text-slate-900">{title}</h4>
          {subtitle ? <p className="mt-0.5 text-[12px] leading-snug text-slate-500">{subtitle}</p> : null}
        </div>
        {badge || null}
      </header>
      <div className="px-4 py-3">{children}</div>
      {footer ? <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-2.5">{footer}</div> : null}
    </section>
  );
}
