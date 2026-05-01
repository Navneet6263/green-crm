"use client";

import { StatCard } from "./ManagerDashboardPrimitives";
import { compact } from "./manager-utils";

export default function ManagerStatsRow({ totalLeads, wonLeads, convRate, pendingFollowups }) {
  const stats = [
    {
      icon: "users",
      label: "Total Leads",
      value: compact(totalLeads),
      tone: "amber",
      change: 12,
    },
    {
      icon: "performance",
      label: "Won Deals",
      value: compact(wonLeads),
      tone: "indigo",
      change: 40,
    },
    {
      icon: "analytics",
      label: "Conversion Rate",
      value: `${convRate}%`,
      tone: "emerald",
      change: 0.3,
    },
    {
      icon: "mail",
      label: "Follow-up Pending",
      value: compact(pendingFollowups),
      tone: "orange",
      change: 18,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
    </div>
  );
}
