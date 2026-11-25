"use client";

import Link from "next/link";
import DashboardIcon from "../dashboard/icons";
import { cn, initials } from "./format";

// The platform console look: the same cards, buttons and fields as the rest of GreenCRM.
export const PANEL_CLASS = "rounded-[14px] bg-white p-4 ring-1 ring-slate-200 sm:p-5";
export const SUB_PANEL_CLASS = "rounded-[12px] bg-slate-50 p-3.5 ring-1 ring-slate-100";
export const INPUT_CLASS = "w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-[13.5px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-50";
export const TEXTAREA_CLASS = `${INPUT_CLASS} min-h-[100px] resize-y`;
export const PRIMARY_BUTTON_CLASS = "inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] bg-brand-700 px-3.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50";
export const SECONDARY_BUTTON_CLASS = "inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] bg-white px-3.5 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
export const GHOST_BUTTON_CLASS = "inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[8px] bg-white px-2.5 text-[12px] font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

const BADGE_TONE = {
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  blue: "bg-blue-50 text-blue-700 ring-blue-100",
  amber: "bg-amber-50 text-amber-800 ring-amber-100",
  rose: "bg-rose-50 text-rose-700 ring-rose-100",
  violet: "bg-violet-50 text-violet-700 ring-violet-100",
  teal: "bg-brand-50 text-brand-800 ring-brand-100",
};

// Validated categorical colours, one per tone, used as the card's dot.
const DOT_TONE = { slate: "#64748b", emerald: "#009a8c", blue: "#3b6fd8", amber: "#b98300", rose: "#d9467c", violet: "#8a55e6", teal: "#0c605d" };

export function Badge({ children, tone = "slate", className = "" }) {
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1", BADGE_TONE[tone] || BADGE_TONE.slate, className)}>{children}</span>;
}

export function Notice({ tone = "info", text, className = "" }) {
  if (!text) return null;
  const c = tone === "error" ? "bg-rose-50 text-rose-800 ring-rose-100" : tone === "success" ? "bg-emerald-50 text-emerald-800 ring-emerald-100" : "bg-slate-50 text-slate-600 ring-slate-100";
  return <div className={cn("rounded-[12px] px-3.5 py-2.5 text-[13px] ring-1", c, className)}>{text}</div>;
}

export function PageIntro({ eyebrow, title, description, actions, meta }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 pt-1">
      <div className="min-w-0">
        {eyebrow ? <p className="text-[12px] font-semibold text-slate-500">{eyebrow}</p> : null}
        <h1 className="text-[22px] font-bold tracking-tight text-slate-900">{title}</h1>
        {description ? <p className="mt-0.5 max-w-2xl text-[13px] text-slate-500">{description}</p> : null}
        {meta ? <div className="mt-2 flex flex-wrap gap-1.5">{meta}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Panel({ eyebrow, title, description, action, className = "", children }) {
  return (
    <section className={cn(PANEL_CLASS, className)}>
      {(eyebrow || title || action) ? (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow ? <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{eyebrow}</p> : null}
            {title ? <h2 className="text-[14px] font-bold text-slate-900">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-[12px] text-slate-500">{description}</p> : null}
          </div>
          {action ? <div className="flex shrink-0 gap-2">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function MetricGrid({ children, className = "" }) {
  return <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>{children}</div>;
}

export function MetricCard({ icon, label, value, note, tone = "slate" }) {
  return (
    <div className="rounded-[14px] bg-white px-4 py-3.5 ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500"><i className="h-2 w-2 rounded-full" style={{ background: DOT_TONE[tone] || DOT_TONE.slate }} />{label}</p>
        {icon ? <DashboardIcon name={icon} className="h-4 w-4 text-slate-300" /> : null}
      </div>
      <p className="mt-1.5 text-[22px] font-bold leading-tight tabular-nums tracking-tight text-slate-900 sm:text-[24px]">{value}</p>
      {note ? <p className="mt-1 truncate text-[11.5px] text-slate-500">{note}</p> : null}
    </div>
  );
}

export function EmptyState({ icon = "dashboard", title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[14px] bg-white px-4 py-12 text-center ring-1 ring-slate-200">
      <span className="grid h-11 w-11 place-items-center rounded-[12px] bg-brand-50 text-brand-700"><DashboardIcon name={icon} className="h-5 w-5" /></span>
      <p className="mt-3 text-[15px] font-bold text-slate-900">{title}</p>
      <p className="mt-1 max-w-sm text-[13px] text-slate-500">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function AvatarLabel({ label, sublabel, tone = "slate" }) {
  const bg = tone === "emerald" ? "bg-brand-700" : tone === "blue" ? "bg-blue-600" : tone === "violet" ? "bg-violet-600" : "bg-slate-700";
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[11px] font-bold text-white", bg)}>{initials(label)}</span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">{label}</p>
        {sublabel ? <p className="truncate text-[11px] text-slate-500">{sublabel}</p> : null}
      </div>
    </div>
  );
}

export function ActionLink({ href, icon, label, description }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-[12px] bg-white p-3 ring-1 ring-slate-200 transition hover:ring-brand-200">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-brand-50 text-brand-700"><DashboardIcon name={icon} className="h-3.5 w-3.5" /></span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-slate-900">{label}</p>
        <p className="truncate text-[11px] text-slate-500">{description}</p>
      </div>
    </Link>
  );
}

export function Modal({ title, description, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-[2px]" onClick={onClose}>
      <div className="tw-buttons w-full max-w-lg rounded-[16px] bg-white p-5 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.45)] ring-1 ring-slate-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[16px] font-bold text-slate-900">{title}</h3>
            {description ? <p className="mt-1 text-[13px] text-slate-500">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} className={GHOST_BUTTON_CLASS}>Close</button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
