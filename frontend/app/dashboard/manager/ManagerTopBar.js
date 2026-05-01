"use client";

import DashboardIcon from "../../../components/dashboard/icons";

function BadgeIcon({ icon, count }) {
  return (
    <button type="button" className="relative grid h-12 w-12 place-items-center rounded-2xl text-slate-700 transition hover:bg-slate-50">
      <DashboardIcon name={icon} className="h-6 w-6" />
      {count > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#FBBF24] px-1 text-[10px] font-black text-slate-950">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </button>
  );
}

export default function ManagerTopBar({ pendingFollowups = 0, overdueTasks = 0 }) {
  const dateText = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="mb-11 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <label className="flex h-16 w-full max-w-[630px] items-center gap-4 rounded-[28px] border border-slate-200 bg-white px-7 text-lg text-slate-400 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m16 16 4 4" />
        </svg>
        <input className="min-w-0 flex-1 bg-transparent font-medium outline-none placeholder:text-slate-400" placeholder="Search anything..." readOnly />
        <span className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-base font-bold text-slate-500">Ctrl + K</span>
      </label>

      <div className="flex items-center justify-between gap-5 xl:justify-end">
        <div className="flex items-center gap-2">
          <BadgeIcon icon="bell" count={overdueTasks} />
          <BadgeIcon icon="mail" count={pendingFollowups} />
        </div>
        <button type="button" className="inline-flex h-16 min-w-[250px] items-center justify-between gap-4 rounded-[32px] bg-white px-7 text-xl font-semibold text-slate-800 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <DashboardIcon name="calendar" className="h-5 w-5 text-slate-500" />
          <span>{dateText}</span>
          <svg viewBox="0 0 20 20" className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 8 4 4 4-4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
