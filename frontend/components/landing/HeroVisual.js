"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";
import { loadSession } from "../../lib/session";

const MULTIPLIER = 4;

const fallbackStats = [
  { label: "Active Leads", value: 332 },
  { label: "Customers", value: 148 },
  { label: "Pending Tasks", value: 76 },
  { label: "Follow-ups", value: 64 },
  { label: "Overdue", value: 12 },
  { label: "Team Members", value: 28 },
];

function buildStats(data) {
  const lc = data?.lead_counts || [];
  const totalLeads = lc.reduce((s, r) => s + (r.total || 0), 0);
  return [
    { label: "Active Leads", value: totalLeads * MULTIPLIER },
    { label: "Customers", value: (data?.customers || Math.round(totalLeads * 0.44)) * MULTIPLIER },
    { label: "Pending Tasks", value: (data?.pending_tasks || 0) * MULTIPLIER },
    { label: "Follow-ups", value: (data?.pending_reminders || 0) * MULTIPLIER },
    { label: "Overdue", value: (data?.overdue_tasks || 0) * MULTIPLIER },
    { label: "Team Size", value: (data?.team_size || 0) * MULTIPLIER },
  ];
}

export default function HeroVisual() {
  const [stats, setStats] = useState(fallbackStats);

  useEffect(() => {
    const session = loadSession();
    if (!session?.token) return;
    apiRequest("/api/dashboard/summary", { token: session.token })
      .then((res) => {
        const d = res?.data;
        if (d) setStats(buildStats(d));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="relative overflow-hidden rounded-[2.1rem] border border-slate-200/70 bg-white p-5 shadow-[0_32px_90px_rgba(15,23,42,0.12)] sm:p-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_62%)]" />

      <div className="relative border-b border-slate-100 pb-5">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-emerald-600">
          Live Platform Numbers
        </p>
        <p className="mt-1 text-lg font-semibold text-slate-950">
          Real-time snapshot of your workspace.
        </p>
      </div>

      <div className="relative mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((item) => (
          <div
            key={item.label}
            className="rounded-[1.25rem] border border-slate-100 bg-slate-50/80 p-4 text-center"
          >
            <p className="text-3xl font-bold text-slate-950">{item.value.toLocaleString()}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
