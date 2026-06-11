"use client";

import { useMemo } from "react";

export default function RecentUpdatesDateFilter({
  datePreset,
  setDatePreset,
  fromDate,
  setFromDate,
  toDate,
  setToDate
}) {
  const handlePresetChange = (e) => {
    const preset = e.target.value;
    setDatePreset(preset);

    if (preset === "custom" || preset === "all") {
      setFromDate("");
      setToDate("");
      return;
    }

    const today = new Date();
    const to = today.toISOString().split("T")[0];
    let from = "";

    switch (preset) {
      case "last7days":
        from = new Date(today.setDate(today.getDate() - 7)).toISOString().split("T")[0];
        break;
      case "last30days":
        from = new Date(today.setDate(today.getDate() - 30)).toISOString().split("T")[0];
        break;
      case "thisMonth":
        from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
        break;
      default:
        break;
    }

    setFromDate(from);
    setToDate(to);
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-bold text-slate-900">Filter by Date</h3>
      <div className="space-y-4">
        <div>
          <select
            value={datePreset}
            onChange={handlePresetChange}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Time</option>
            <option value="last7days">Last 7 Days</option>
            <option value="last30days">Last 30 Days</option>
            <option value="thisMonth">This Month</option>
            <option value="custom">Custom Range...</option>
          </select>
        </div>

        {datePreset === "custom" && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-700 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-700 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
