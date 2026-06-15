"use client";

import DashboardIcon from "../dashboard/icons";

export default function AttendanceAdminSearch({ search, setSearch }) {
  return (
    <div className="relative mb-6">
      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
        <DashboardIcon name="search" className="w-5 h-5 text-indigo-400/70" />
      </div>
      <input
        type="text"
        className="block w-full pl-12 pr-4 py-3.5 text-sm text-slate-800 bg-white border border-indigo-100/60 rounded-2xl shadow-[0_4px_20px_-4px_rgba(99,102,241,0.08)] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 focus:outline-none transition-all duration-300 placeholder-slate-400 font-medium"
        placeholder="Search employee by name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {search && (
        <button
          onClick={() => setSearch("")}
          className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-indigo-500 transition-colors"
        >
          <DashboardIcon name="close" className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
