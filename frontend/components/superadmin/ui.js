"use client";

import Link from "next/link";

import DashboardIcon from "../dashboard/icons";
import { cn, initials } from "./format";

export const PANEL_CLASS =
  "rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_32px_rgba(15,23,42,0.05)]";
export const SUB_PANEL_CLASS = "rounded-[22px] border border-slate-200 bg-slate-50/80 p-4";
export const INPUT_CLASS =
  "w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100";
export const TEXTAREA_CLASS = `${INPUT_CLASS} min-h-[120px] resize-y`;
export const PRIMARY_BUTTON_CLASS =
  "inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-emerald-600 bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(22,163,74,0.18)] transition hover:border-emerald-700 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60";
export const SECONDARY_BUTTON_CLASS =
  "inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";
export const GHOST_BUTTON_CLASS =
  "inline-flex min-h-[40px] cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-transparent bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60";

const BADGE_STYLES = {
  slate: "border-slate-200 bg-slate-50 text-slate-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
};

const METRIC_TONES = {
  slate: { chip: "bg-slate-100 text-slate-700", icon: "bg-slate-900 text-white" },
  emerald: { chip: "bg-emerald-100 text-emerald-700", icon: "bg-emerald-600 text-white" },
  blue: { chip: "bg-blue-100 text-blue-700", icon: "bg-blue-600 text-white" },
  amber: { chip: "bg-amber-100 text-amber-700", icon: "bg-amber-500 text-white" },
  rose: { chip: "bg-rose-100 text-rose-700", icon: "bg-rose-600 text-white" },
  violet: { chip: "bg-violet-100 text-violet-700", icon: "bg-violet-600 text-white" },
};

export function Badge({ children, tone = "slate", className = "" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        BADGE_STYLES[tone] || BADGE_STYLES.slate,
        className
      )}
    >
      {children}
    </span>
  );
}

export function Notice({ tone = "info", text, className = "" }) {
  if (!text) {
    return null;
  }

  const palette =
    tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-slate-50 text-slate-600";

  return <div className={cn("rounded-[18px] border px-4 py-3 text-sm font-medium", palette, className)}>{text}</div>;
}

export function PageIntro({ eyebrow, title, description, actions, meta }) {
  return (
    <section className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? (
          <span className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700/80">{eyebrow}</span>
        ) : null}
        <h1 className="mt-2 text-[clamp(1.7rem,2.6vw,2.45rem)] font-black leading-tight text-slate-900">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
        {meta ? <div className="mt-4 flex flex-wrap gap-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </section>
  );
}

export function Panel({ eyebrow, title, description, action, className = "", children }) {
  return (
    <section className={cn(PANEL_CLASS, className)}>
      {(eyebrow || title || description || action) ? (
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            {eyebrow ? (
              <span className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">{eyebrow}</span>
            ) : null}
            {title ? <h2 className="mt-2 text-xl font-black text-slate-900">{title}</h2> : null}
            {description ? <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p> : null}
          </div>
          {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function MetricGrid({ children, className = "" }) {
  return <section className={cn("grid gap-4 md:grid-cols-2 2xl:grid-cols-4", className)}>{children}</section>;
}

export function MetricCard({ icon, label, value, note, tone = "slate" }) {
  const style = METRIC_TONES[tone] || METRIC_TONES.slate;

  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]", style.chip)}>
            {label}
          </span>
          <strong className="mt-3 block text-[clamp(1.45rem,2vw,2rem)] font-black leading-none text-slate-900">{value}</strong>
          {note ? <p className="mt-2 text-sm leading-6 text-slate-500">{note}</p> : null}
        </div>
        {icon ? (
          <span className={cn("grid h-11 w-11 place-items-center rounded-[16px]", style.icon)}>
            <DashboardIcon name={icon} className="h-5 w-5" />
          </span>
        ) : null}
      </div>
    </article>
  );
}

export function EmptyState({ icon = "dashboard", title, description, action }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-[18px] bg-white text-slate-500 shadow-sm">
        <DashboardIcon name={icon} className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function AvatarLabel({ label, sublabel, tone = "slate" }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className={cn(
          "grid h-11 w-11 flex-shrink-0 place-items-center rounded-[16px] text-sm font-black",
          tone === "emerald"
            ? "bg-emerald-600 text-white"
            : tone === "blue"
              ? "bg-blue-600 text-white"
              : tone === "violet"
                ? "bg-violet-600 text-white"
                : "bg-slate-900 text-white"
        )}
      >
        {initials(label)}
      </span>
      <div className="min-w-0">
        <strong className="block truncate text-sm text-slate-900">{label}</strong>
        {sublabel ? <span className="mt-1 block truncate text-xs text-slate-500">{sublabel}</span> : null}
      </div>
    </div>
  );
}

export function ActionLink({ href, icon, label, description }) {
  return (
    <Link
      href={href}
      className="group rounded-[20px] border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_24px_rgba(15,23,42,0.06)]"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-slate-900 text-white">
          <DashboardIcon name={icon} className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <strong className="block text-sm text-slate-900">{label}</strong>
          <span className="mt-1 block text-xs text-slate-500">{description}</span>
        </div>
      </div>
    </Link>
  );
}

export function Modal({ title, description, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/35 px-4 py-6">
      <div className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_28px_60px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-black text-slate-900">{title}</h3>
            {description ? <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} className={GHOST_BUTTON_CLASS} aria-label="Close">
            Close
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
