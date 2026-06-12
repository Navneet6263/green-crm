import React from "react";
import { formatDashboardCount } from "./adminDashboardUtils";

const HERO_STAT_CARD =
  "rounded-[26px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(247,241,233,0.92))] p-5 shadow-[0_18px_42px_rgba(33,48,74,0.10)] backdrop-blur-xl transition duration-200 ease-out hover:scale-[1.02] hover:border-[#dbcdb8] hover:shadow-[0_24px_52px_rgba(33,48,74,0.14)]";

export default function AdminHeroStats({ totalVisibleLeads, winRate, demoDoneCount, demoCompletionRate }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className={HERO_STAT_CARD}>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#93816a]">Visible Lead Base</p>
        <strong className="mt-4 block text-4xl font-black tracking-tight text-[#0f172a]">
          {formatDashboardCount(totalVisibleLeads)}
        </strong>
        <p className="mt-3 text-sm leading-6 text-[#64748b]">
          Includes all currently visible statuses from new through closed stages.
        </p>
      </div>
      <div className={HERO_STAT_CARD}>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#93816a]">Win Rate</p>
        <strong className="mt-4 block text-4xl font-black tracking-tight text-[#5eead4]">{winRate}</strong>
        <p className="mt-3 text-sm leading-6 text-[#64748b]">
          Closed won share across the visible lead base.
        </p>
      </div>
      <div className={HERO_STAT_CARD}>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#93816a]">Demo Done</p>
        <strong className="mt-4 block text-4xl font-black tracking-tight text-[#34d399]">
          {formatDashboardCount(demoDoneCount)}
        </strong>
        <p className="mt-3 text-sm leading-6 text-[#64748b]">
          Leads already moved from booked demo into completed demo status.
        </p>
      </div>
      <div className={HERO_STAT_CARD}>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#93816a]">Demo Completion</p>
        <strong className="mt-4 block text-4xl font-black tracking-tight text-[#a78bfa]">
          {demoCompletionRate}
        </strong>
        <p className="mt-3 text-sm leading-6 text-[#64748b]">
          Share of demo-stage leads already marked demo done.
        </p>
      </div>
    </div>
  );
}
