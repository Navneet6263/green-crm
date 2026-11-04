"use client";

const SELECT = "h-9 w-full min-w-0 rounded-[10px] border border-slate-200 bg-white px-2.5 text-[13px] text-slate-800 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-50 sm:w-auto sm:max-w-[170px]";
const KPI_COLORS = ["#3b6fd8", "#009a8c", "#d9467c", "#b98300"];
const SIGNAL_COLORS = ["#009a8c", "#d9467c", "#3b6fd8", "#b98300"];

function Stat({ label, value, hint, color }) {
  return (
    <div className="relative overflow-hidden rounded-[12px] bg-white px-4 py-3.5 ring-1 ring-slate-200">
      <p className="text-[12px] font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-[20px] font-bold leading-none tabular-nums text-slate-900">{value}</p>
      {hint ? <p className="mt-1 truncate text-[11.5px] text-slate-400">{hint}</p> : null}
      <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full" style={{ background: color }} aria-hidden="true" />
    </div>
  );
}

/** Filters and headline numbers for the Workflow tab. */
export function WorkflowHeader({ deck, filters, onFilterChange, onResetFilters, onRefresh }) {
  const hasFilter = Object.values(filters).some((v) => v && v !== "all");
  const selects = [
    ["stage", deck.stageOptions, "All stages"],
    ["status", deck.statusOptions, "All statuses"],
    ["owner", deck.filterOptions.owners, "All owners"],
    ["priority", deck.filterOptions.priorities, "All priorities"],
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-[14px] bg-white p-2.5 ring-1 ring-slate-200">
        <label className="flex h-9 min-w-[200px] flex-1 items-center gap-2 rounded-[10px] border border-slate-200 bg-slate-50 px-3 text-slate-400 focus-within:border-brand-300 focus-within:bg-white">
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input value={filters.query} onChange={(e) => onFilterChange("query", e.target.value)} placeholder="Search lead, owner or company" aria-label="Search" className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-800 outline-none" />
        </label>
        {selects.map(([field, options, placeholder]) => (
          <select key={field} className={SELECT} value={filters[field]} onChange={(e) => onFilterChange(field, e.target.value)} aria-label={placeholder}>
            <option value="all">{placeholder}</option>
            {(options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}
        {hasFilter ? <button type="button" onClick={onResetFilters} className="h-9 rounded-[10px] px-2.5 text-[12.5px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800">Clear</button> : null}
        <button type="button" onClick={onRefresh} aria-label="Refresh" title="Refresh" className="grid h-9 w-9 place-items-center rounded-[10px] text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {deck.kpis.map((k, i) => <Stat key={k.label} label={k.label} value={k.value} hint={k.hint} color={KPI_COLORS[i % KPI_COLORS.length]} />)}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {deck.topCards.map((c, i) => (
          <div key={c.label} className="flex items-center gap-3 rounded-[12px] bg-white px-4 py-3 ring-1 ring-slate-200">
            <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: SIGNAL_COLORS[i % SIGNAL_COLORS.length] }} aria-hidden="true" />
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-semibold text-slate-500">{c.label}</span>
              <span className="block truncate text-[15px] font-bold text-slate-900">{c.value}</span>
              {c.hint ? <span className="block truncate text-[11px] text-slate-400">{c.hint}</span> : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
