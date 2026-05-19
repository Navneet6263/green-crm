"use client";

import DashboardIcon from "../../dashboard/icons";

export default function LeadSearchInput({ value, onChange, placeholder }) {
  return (
    <label htmlFor="lead-search" className="flex items-center gap-2 rounded-[22px] border border-[#eadfcd] bg-white px-4 py-3 text-sm text-[#6f614c] shadow-[0_10px_22px_rgba(79,58,22,0.05)]">
      <DashboardIcon name="leads" className="h-4 w-4 shrink-0 pointer-events-none text-[#8f816a]" />
      <input
        id="lead-search"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full border-0 bg-transparent p-0 text-sm text-[#060710] outline-none placeholder:text-[#9c8e76]"
      />
    </label>
  );
}
