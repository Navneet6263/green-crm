"use client";

import Link from "next/link";
import { compact, titleize, initials, countByStatus, STATUS_ORDER, ROLE_TONE } from "./manager-utils";

const BAR_COLORS = ["bg-violet-400","bg-sky-400","bg-indigo-400","bg-blue-400","bg-purple-400","bg-teal-400","bg-emerald-400","bg-cyan-400","bg-green-400"];

function GlassPanel({ title, linkHref, linkLabel, children }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between border-b border-slate-100/80 px-5 py-4">
        <p className="text-sm font-bold text-slate-800">{title}</p>
        <Link href={linkHref} prefetch={false} className="text-xs font-semibold text-violet-500 hover:underline">
          {linkLabel} →
        </Link>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function StageBar({ label, value, max, color }) {
  const pct = Math.max(3, Math.round((value / max) * 100));
  return (
    <div className="flex items-center gap-3">
      <p className="w-28 shrink-0 truncate text-xs text-slate-500">{label}</p>
      <div className="flex-1 overflow-hidden rounded-full bg-slate-100" style={{ height: 6 }}>
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <p className="w-8 shrink-0 text-right text-xs font-bold text-slate-700">{compact(value)}</p>
    </div>
  );
}

function TeamRow({ user }) {
  const isActive = user.is_active !== false;
  return (
    <div className="flex items-center gap-3 border-b border-slate-100/80 py-3 last:border-0">
      <div className="relative shrink-0">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-800 text-xs font-black text-white">
          {initials(user.displayName)}
        </span>
        <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${isActive ? "bg-emerald-400" : "bg-slate-300"}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-slate-700">{user.displayName}</p>
          <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${ROLE_TONE[user.role] || "bg-slate-100 text-slate-500"}`}>
            {titleize(user.role || "user")}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-slate-400">
          <span className="font-semibold text-violet-500">{compact(user.ownedLeads)}</span> leads ·{" "}
          <span className="font-semibold text-slate-600">{compact(user.ownedTasks)}</span> tasks
        </p>
      </div>
    </div>
  );
}

export default function ManagerPipelineSection({ leadCounts, ownerLoad }) {
  const points = STATUS_ORDER.map((s, i) => ({
    key: s, label: titleize(s),
    value: countByStatus(leadCounts, s),
    color: BAR_COLORS[i],
  }));
  const max = Math.max(...points.map((p) => p.value), 1);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GlassPanel title="Stage Breakdown" linkHref="/workflow" linkLabel="View workflow">
        <div className="space-y-3">
          {points.map((item) => (
            <StageBar key={item.key} label={item.label} value={item.value} max={max} color={item.color} />
          ))}
        </div>
      </GlassPanel>

      <GlassPanel title="Team Load" linkHref="/settings/teams" linkLabel="Manage">
        {ownerLoad.length
          ? ownerLoad.map((user) => <TeamRow key={user.user_id} user={user} />)
          : <p className="py-6 text-center text-sm text-slate-400">No team data available.</p>}
      </GlassPanel>
    </div>
  );
}
