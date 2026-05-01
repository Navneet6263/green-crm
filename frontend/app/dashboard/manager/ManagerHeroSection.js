"use client";

import Link from "next/link";
import DashboardIcon from "../../../components/dashboard/icons";
import { compact, KICKER } from "./manager-utils";

const KPI_CARDS = [
  { key: "leads",     label: "Total Leads",      color: "blue",   border: "border-l-blue-500",   hint: "Team pipeline" },
  { key: "pipeline",  label: "Open Pipeline",    color: "violet", border: "border-l-violet-500", hint: "Active deals" },
  { key: "won",       label: "Closed Won",       color: "green",  border: "border-l-green-500",  hint: "Won this scope" },
  { key: "followups", label: "Pending Follow-ups", color: "orange", border: "border-l-orange-500", hint: "Needs push" },
];

const VALUE_COLOR = {
  blue: "text-blue-600", violet: "text-violet-600",
  green: "text-green-600", orange: "text-orange-500",
};

const ACTIONS = [
  { href: "/leads",       icon: "leads",       title: "Lead Workspace",  copy: "Queue, ownership, stage movement",  dot: "bg-blue-500" },
  { href: "/tasks",       icon: "tasks",       title: "Task Board",      copy: "Overdue execution at a glance",     dot: "bg-orange-500" },
  { href: "/analytics",   icon: "analytics",   title: "Analytics",       copy: "Source mix and stage performance",  dot: "bg-violet-500" },
  { href: "/performance", icon: "performance", title: "Performance",     copy: "Team load, wins, output compare",   dot: "bg-green-500" },
];

export default function ManagerHeroSection({ totalLeads, openPipeline, wonLeads, pendingFollowups }) {
  const values = { leads: totalLeads, pipeline: openPipeline, won: wonLeads, followups: pendingFollowups };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <p className={KICKER}>Manager Cockpit</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
          Good day — here&apos;s your team pulse
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPI_CARDS.map((card) => (
          <div
            key={card.key}
            className={`rounded-2xl border border-slate-200 border-l-4 ${card.border} bg-slate-50 px-5 py-4 transition hover:-translate-y-0.5 hover:shadow-md`}
          >
            <p className={KICKER}>{card.label}</p>
            <p className={`mt-2 text-3xl font-black ${VALUE_COLOR[card.color]}`}>
              {compact(values[card.key])}
            </p>
            <p className="mt-1 text-xs text-slate-400">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            prefetch={false}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          >
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${action.dot} bg-opacity-10`}>
              <DashboardIcon name={action.icon} className="h-4 w-4 text-slate-700" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">{action.title}</p>
              <p className="truncate text-xs text-slate-400">{action.copy}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
