import React from "react";
import { formatDashboardCount } from "./adminDashboardUtils";

const stats = [
  { key: "leads", label: "Visible Leads", color: "#3b82f6" },
  { key: "winRate", label: "Win Rate", color: "#10b981" },
  { key: "demo", label: "Demo Done", color: "#f59e0b" },
  { key: "completion", label: "Demo Completion", color: "#6366f1" },
];

export default function AdminHeroStats({ totalVisibleLeads, winRate, demoDoneCount, demoCompletionRate }) {
  const values = {
    leads: formatDashboardCount(totalVisibleLeads),
    winRate,
    demo: formatDashboardCount(demoDoneCount),
    completion: demoCompletionRate,
  };

  return (
    <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {stats.map((stat) => (
        <div key={stat.key} className="flex flex-col rounded-xl border border-slate-100 bg-slate-50 p-3 transition-all duration-300 hover:bg-slate-100/50">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{stat.label}</p>
          <strong className="mt-1.5 text-2xl font-black tracking-tight" style={{ color: stat.color }}>
            {values[stat.key]}
          </strong>
        </div>
      ))}
    </div>
  );
}
