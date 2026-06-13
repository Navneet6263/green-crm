import React from "react";
import AdminInsightCard from "./AdminInsightCard";
import { LEAD_OPEN_STATUSES } from "../../../lib/leadStatus";
import { formatDashboardCount } from "./adminDashboardUtils";

export default function AdminInsightCards({ insightCards }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">Intelligence</p>
          <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Smart Insights</h3>
        </div>
        <p className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 shadow-sm">
          {formatDashboardCount(LEAD_OPEN_STATUSES.length)} tracked statuses
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {insightCards.map((card) => (
          <AdminInsightCard key={card.label} {...card} />
        ))}
      </div>
    </section>
  );
}
