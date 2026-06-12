import React from "react";
import { LEAD_STATUS_ORDER, LEAD_STATUS_LABELS } from "../../../lib/leadStatus";

export default function AdminAdvancedFilters({
  filters,
  setFilters,
  onReset,
  products = [],
  sources = ["Referral", "Website", "Organic", "Social Media", "Cold Call", "Other"],
}) {
  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const hasActiveFilters =
    filters.from_date ||
    filters.to_date ||
    filters.status ||
    filters.priority ||
    filters.lead_source ||
    filters.product_id;

  return (
    <div className="mb-6 rounded-[24px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.7),rgba(250,244,235,0.85))] p-5 shadow-[0_12px_32px_rgba(33,48,74,0.06)] backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#0f172a]">Advanced Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="text-xs font-medium text-[#ef4444] hover:text-[#dc2626] transition-colors"
          >
            Reset Filters
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <div className="flex flex-col space-y-1">
          <label className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">From Date</label>
          <input
            type="date"
            value={filters.from_date || ""}
            onChange={(e) => updateFilter("from_date", e.target.value)}
            className="h-10 w-full rounded-xl border border-black/5 bg-white/60 px-3 text-sm text-slate-800 focus:border-[#4f8cff] focus:outline-none focus:ring-2 focus:ring-[#cfe0ff]"
          />
        </div>
        <div className="flex flex-col space-y-1">
          <label className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">To Date</label>
          <input
            type="date"
            value={filters.to_date || ""}
            onChange={(e) => updateFilter("to_date", e.target.value)}
            className="h-10 w-full rounded-xl border border-black/5 bg-white/60 px-3 text-sm text-slate-800 focus:border-[#4f8cff] focus:outline-none focus:ring-2 focus:ring-[#cfe0ff]"
          />
        </div>
        <div className="flex flex-col space-y-1">
          <label className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Status</label>
          <select
            value={filters.status || ""}
            onChange={(e) => updateFilter("status", e.target.value)}
            className="h-10 w-full rounded-xl border border-black/5 bg-white/60 px-3 text-sm text-slate-800 focus:border-[#4f8cff] focus:outline-none focus:ring-2 focus:ring-[#cfe0ff]"
          >
            <option value="">All Statuses</option>
            {LEAD_STATUS_ORDER.map((status) => (
              <option key={status} value={status}>
                {LEAD_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col space-y-1">
          <label className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Priority</label>
          <select
            value={filters.priority || ""}
            onChange={(e) => updateFilter("priority", e.target.value)}
            className="h-10 w-full rounded-xl border border-black/5 bg-white/60 px-3 text-sm text-slate-800 focus:border-[#4f8cff] focus:outline-none focus:ring-2 focus:ring-[#cfe0ff]"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div className="flex flex-col space-y-1">
          <label className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Source</label>
          <select
            value={filters.lead_source || ""}
            onChange={(e) => updateFilter("lead_source", e.target.value)}
            className="h-10 w-full rounded-xl border border-black/5 bg-white/60 px-3 text-sm text-slate-800 focus:border-[#4f8cff] focus:outline-none focus:ring-2 focus:ring-[#cfe0ff]"
          >
            <option value="">All Sources</option>
            {sources.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col space-y-1">
          <label className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Product</label>
          <select
            value={filters.product_id || ""}
            onChange={(e) => updateFilter("product_id", e.target.value)}
            className="h-10 w-full rounded-xl border border-black/5 bg-white/60 px-3 text-sm text-slate-800 focus:border-[#4f8cff] focus:outline-none focus:ring-2 focus:ring-[#cfe0ff]"
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.product_id} value={p.product_id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
