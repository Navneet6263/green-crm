"use client";

import DashboardIcon from "../../../components/dashboard/icons";
import { initials, titleize, STATUS_TONE } from "./manager-utils";

const CARD = "rounded-2xl border border-slate-100 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.06)]";
const AVATAR_BG = ["#7C3AED", "#2563EB", "#0D9488", "#DB2777", "#D97706"];

const TONE_STYLES = {
  amber: { cardBg: "#FFFBEB", iconBg: "#FEF3C7", iconColor: "#F59E0B", changeColor: "#10B981" },
  indigo: { cardBg: "#F5F3FF", iconBg: "#EDE9FE", iconColor: "#6366F1", changeColor: "#10B981" },
  emerald: { cardBg: "#F0FDF4", iconBg: "#DCFCE7", iconColor: "#10B981", changeColor: "#10B981" },
  orange: { cardBg: "#FFF7ED", iconBg: "#FFEDD5", iconColor: "#F97316", changeColor: "#F97316" },
};

export function ChartCard({ children, className = "" }) {
  return <section className={`${CARD} p-5 ${className}`.trim()}>{children}</section>;
}

export function StatCard({ icon, label, value, sub, tone = "amber", change }) {
  const s = TONE_STYLES[tone] || TONE_STYLES.amber;
  return (
    <article className="rounded-2xl border border-slate-100 p-5 shadow-[0_2px_12px_rgba(15,23,42,0.06)]" style={{ background: s.cardBg }}>
      <div className="flex items-start gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl" style={{ background: s.iconBg, color: s.iconColor }}>
          <DashboardIcon name={icon} className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <strong className="mt-1 block text-[2rem] font-black leading-none text-slate-950">{value}</strong>
        </div>
      </div>
      {change != null ? (
        <p className="mt-3 text-xs font-semibold" style={{ color: s.changeColor }}>+ {change}% from last month</p>
      ) : sub ? (
        <p className="mt-3 text-xs font-medium text-slate-400">{sub}</p>
      ) : null}
    </article>
  );
}

export function ProgressRow({ color = "#7C3AED", label, value, percent, dot = false }) {
  const width = Math.max(value > 0 ? 2 : 0, Math.min(100, percent || 0));
  return (
    <div className="flex items-center gap-3 text-sm">
      {dot ? <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} /> : null}
      <span className="w-[110px] shrink-0 truncate font-medium text-slate-700">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full transition-all" style={{ width: `${width}%`, background: color }} />
      </div>
      <span className="w-8 text-right font-bold text-slate-950">{value}</span>
    </div>
  );
}

export function StatusBadge({ status }) {
  const key = String(status || "new").toLowerCase();
  return (
    <span className={`inline-flex rounded-lg px-3 py-1 text-xs font-semibold ${STATUS_TONE[key] || STATUS_TONE.new}`}>
      {titleize(key)}
    </span>
  );
}

export function AvatarInitials({ name, colorIndex = 0 }) {
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-black text-white" style={{ background: AVATAR_BG[colorIndex % AVATAR_BG.length] }}>
      {initials(name)}
    </span>
  );
}
