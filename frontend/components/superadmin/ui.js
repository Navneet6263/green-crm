"use client";

import Link from "next/link";
import DashboardIcon from "../dashboard/icons";
import { cn, initials } from "./format";

export const PANEL_CLASS = "rounded-2xl border border-slate-100 bg-white p-5";
export const SUB_PANEL_CLASS = "rounded-xl border border-slate-100 bg-slate-50 p-3.5";
export const INPUT_CLASS = "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100";
export const TEXTAREA_CLASS = `${INPUT_CLASS} min-h-[100px] resize-y`;
export const PRIMARY_BUTTON_CLASS = "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-[13px] font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50";
export const SECONDARY_BUTTON_CLASS = "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50";
export const GHOST_BUTTON_CLASS = "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-slate-100 px-3 text-[13px] font-medium text-slate-600 transition hover:bg-slate-200 disabled:opacity-50";

const BADGE_TONE = {
  slate: "bg-slate-100 text-slate-600",
  emerald: "bg-emerald-50 text-emerald-700",
  blue: "bg-blue-50 text-blue-700",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
  violet: "bg-violet-50 text-violet-700",
};

const ICON_TONE = {
  slate: "bg-slate-900 text-white",
  emerald: "bg-emerald-600 text-white",
  blue: "bg-blue-600 text-white",
  amber: "bg-amber-500 text-white",
  rose: "bg-rose-600 text-white",
  violet: "bg-violet-600 text-white",
};

export function Badge({ children, tone = "slate", className = "" }) {
  return <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold", BADGE_TONE[tone] || BADGE_TONE.slate, className)}>{children}</span>;
}

export function Notice({ tone = "info", text, className = "" }) {
  if (!text) return null;
  const c = tone === "error" ? "bg-rose-50 text-rose-700" : tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-600";
  return <div className={cn("rounded-lg px-4 py-2.5 text-sm", c, className)}>{text}</div>;
}

export function PageIntro({ eyebrow, title, description, actions, meta }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {eyebrow ? <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{eyebrow}</p> : null}
        <h1 className="mt-1 text-xl font-bold text-slate-900">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-500 max-w-xl">{description}</p> : null}
        {meta ? <div className="mt-2.5 flex flex-wrap gap-1.5">{meta}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({ eyebrow, title, description, action, className = "", children }) {
  return (
    <section className={cn(PANEL_CLASS, className)}>
      {(eyebrow || title || action) ? (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {eyebrow ? <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{eyebrow}</p> : null}
            {title ? <h2 className="mt-0.5 text-[15px] font-bold text-slate-900">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
          </div>
          {action ? <div className="flex shrink-0 gap-2">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function MetricGrid({ children, className = "" }) {
  return <div className={cn("grid gap-3 grid-cols-2 lg:grid-cols-3", className)}>{children}</div>;
}

export function MetricCard({ icon, label, value, note, tone = "slate" }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-4 py-3.5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        {icon ? <span className={cn("grid h-8 w-8 place-items-center rounded-lg", ICON_TONE[tone] || ICON_TONE.slate)}><DashboardIcon name={icon} className="h-3.5 w-3.5" /></span> : null}
      </div>
      <p className="mt-1.5 text-2xl font-bold text-slate-900">{value}</p>
      {note ? <p className="mt-1 text-[12px] text-slate-400">{note}</p> : null}
    </div>
  );
}

export function EmptyState({ icon = "dashboard", title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-slate-400 shadow-sm"><DashboardIcon name={icon} className="h-5 w-5" /></span>
      <p className="mt-3 text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function AvatarLabel({ label, sublabel, tone = "slate" }) {
  const bg = tone === "emerald" ? "bg-emerald-600" : tone === "blue" ? "bg-blue-600" : tone === "violet" ? "bg-violet-600" : "bg-slate-800";
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
    <Link href={href} className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white p-3 transition hover:border-slate-200 hover:bg-slate-50">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-900 text-white"><DashboardIcon name={icon} className="h-3.5 w-3.5" /></span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-slate-900">{label}</p>
        <p className="truncate text-[11px] text-slate-500">{description}</p>
      </div>
    </Link>
  );
}

export function Modal({ title, description, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} className={GHOST_BUTTON_CLASS}>Close</button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
