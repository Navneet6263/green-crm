"use client";

import { compact, money } from "../../../app/analytics/analytics-utils";

export { compact, money };

// Categorical colours (validated palette) in fixed order; health uses the reserved status colours.
export const COLORS = ["#009a8c", "#3b6fd8", "#d9467c", "#b98300", "#8a55e6", "#e06a10"];
export const HEALTH = {
  active: { label: "Active", text: "Signed in this week and adding leads", dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 ring-emerald-100", bar: "#16a34a" },
  quiet: { label: "Quiet", text: "Signed in, but little work lately", dot: "bg-amber-500", chip: "bg-amber-50 text-amber-800 ring-amber-100", bar: "#d97706" },
  new: { label: "New", text: "Started in the last 2 weeks", dot: "bg-blue-500", chip: "bg-blue-50 text-blue-700 ring-blue-100", bar: "#3b6fd8" },
  at_risk: { label: "At risk", text: "Nobody signed in for 2 weeks", dot: "bg-rose-500", chip: "bg-rose-50 text-rose-700 ring-rose-100", bar: "#e11d48" },
  suspended: { label: "Suspended", text: "Switched off by the platform", dot: "bg-slate-400", chip: "bg-slate-100 text-slate-600 ring-slate-200", bar: "#94a3b8" },
};
export const STATUS_CHIP = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  trial: "bg-amber-50 text-amber-800 ring-amber-100",
  suspended: "bg-rose-50 text-rose-700 ring-rose-100",
};
export const MODULE_LABELS = {
  leads: "Leads", customers: "Customers", workflow: "Workflow", products: "Products", team_management: "Team management", tasks: "Tasks",
  calendar: "Calendar", communications: "Communications", attendance: "Attendance", analytics: "Analytics", support: "Support",
  documents: "Documents", performance: "Performance", developer_api: "Developer API",
};

export const P = {
  panel: "rounded-[14px] bg-white ring-1 ring-slate-200",
  small: "inline-flex h-8 items-center justify-center gap-1.5 rounded-[8px] bg-white px-2.5 text-[12px] font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50",
  input: "h-9 w-full min-w-0 rounded-[10px] border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-50",
};

export const titleize = (v = "") => String(v).replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
export const num = (v) => new Intl.NumberFormat("en-IN").format(Number(v) || 0);
export const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

export function ago(value) {
  if (!value) return "Never";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return minutes < 1 ? "Just now" : `${minutes} min ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} h ago`;
  const days = Math.floor(minutes / 1440);
  return days < 60 ? `${days} d ago` : `${Math.floor(days / 30)} mo ago`;
}

export function Spark({ values, color }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * 76 + 2).toFixed(1)},${(26 - (v / max) * 22).toFixed(1)}`).join(" ");
  return <svg width="80" height="28" aria-hidden="true" className="shrink-0"><polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}

export function Panel({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`${P.panel} min-w-0 p-4 ${className}`}>
      {title ? (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-slate-900">{title}</p>
            {subtitle ? <p className="mt-0.5 text-[12px] text-slate-500">{subtitle}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Chip({ className, children }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${className}`}>{children}</span>;
}
