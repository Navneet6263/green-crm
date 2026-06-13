import React from "react";
import { LEAD_STATUS_ORDER, LEAD_STATUS_LABELS } from "../../../lib/leadStatus";

const INPUT_CLASS = "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white";

export default function AdminAdvancedFilters({
  filters, setFilters, onReset,
  products = [],
  sources = ["Referral", "Website", "Organic", "Social Media", "Cold Call", "Other"],
}) {
  const update = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
  const hasActive = filters.from_date || filters.to_date || filters.status || filters.priority || filters.lead_source || filters.product_id;

  const applyQuickDate = (days) => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - days);
    
    const format = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    setFilters((prev) => ({
      ...prev,
      from_date: format(from),
      to_date: format(to)
    }));
  };

  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Filters</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 mr-1">Quick:</span>
          <button onClick={() => applyQuickDate(7)} className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900">7 Days</button>
          <button onClick={() => applyQuickDate(30)} className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900">30 Days</button>
          <button onClick={() => applyQuickDate(90)} className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900">90 Days</button>
          {hasActive && (
            <button onClick={onReset} className="ml-2 text-[11px] font-bold text-rose-500 hover:text-rose-600 transition-colors">
              Reset All
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">From</label>
          <input type="date" value={filters.from_date || ""} onChange={(e) => update("from_date", e.target.value)} className={INPUT_CLASS} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">To</label>
          <input type="date" value={filters.to_date || ""} onChange={(e) => update("to_date", e.target.value)} className={INPUT_CLASS} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Status</label>
          <select value={filters.status || ""} onChange={(e) => update("status", e.target.value)} className={INPUT_CLASS}>
            <option value="">All</option>
            {LEAD_STATUS_ORDER.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Priority</label>
          <select value={filters.priority || ""} onChange={(e) => update("priority", e.target.value)} className={INPUT_CLASS}>
            <option value="">All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Source</label>
          <select value={filters.lead_source || ""} onChange={(e) => update("lead_source", e.target.value)} className={INPUT_CLASS}>
            <option value="">All</option>
            {sources.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Product</label>
          <select value={filters.product_id || ""} onChange={(e) => update("product_id", e.target.value)} className={INPUT_CLASS}>
            <option value="">All</option>
            {products.map((p) => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
