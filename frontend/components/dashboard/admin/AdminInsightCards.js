import React from "react";
import AdminInsightCard from "./AdminInsightCard";
import { LEAD_OPEN_STATUSES } from "../../../lib/leadStatus";
import { formatDashboardCount } from "./adminDashboardUtils";

const PAGE_SURFACE =
  "relative overflow-hidden rounded-[30px] border border-white/75 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.13),transparent_28%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(250,244,235,0.96)_52%,rgba(247,240,229,0.98)_100%)] p-5 text-[#0f172a] shadow-[0_22px_60px_rgba(33,48,74,0.10)] backdrop-blur-xl md:p-6";

export default function AdminInsightCards({ insightCards }) {
  return (
    <section className={PAGE_SURFACE}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#93816a]">Smart Insights</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#0f172a]">What needs action now.</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748b]">
            These cards point to the specific pockets of pipeline risk that deserve immediate admin attention.
          </p>
        </div>
        <p className="rounded-full border border-[#e4d9ca] bg-white/80 px-4 py-2 text-xs font-semibold text-[#64748b]">
          {formatDashboardCount(LEAD_OPEN_STATUSES.length)} tracked open statuses
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {insightCards.map((card) => (
          <AdminInsightCard key={card.label} {...card} />
        ))}
      </div>
    </section>
  );
}
