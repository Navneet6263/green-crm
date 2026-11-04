"use client";

import DashboardIcon from "../../dashboard/icons";

export default function LeadSearchInput({ value, onChange, placeholder }) {
  return (
    <label htmlFor="lead-search" className="flex h-9 items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-3 text-[13px] text-slate-500 focus-within:border-brand-400">
      <DashboardIcon name="leads" className="h-4 w-4 shrink-0 pointer-events-none text-[#94a3b8]" />
      <input
        id="lead-search"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full border-0 bg-transparent p-0 text-[13px] text-slate-900 outline-none placeholder:text-slate-400"
      />
    </label>
  );
}
