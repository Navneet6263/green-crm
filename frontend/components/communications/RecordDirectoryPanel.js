import DashboardIcon from "../dashboard/icons";
import { INPUT_CLASS, KICKER_CLASS } from "./constants";

const GHOST = "inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-700 transition hover:border-slate-300 disabled:opacity-50";
const GOLD  = "inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-[13px] font-semibold text-amber-900 transition hover:bg-amber-100";

const TYPE_ICON = { lead: "🎯", customer: "🏢", all: "📋" };

export default function RecordDirectoryPanel({
  currentPage, totalPages, search, setSearch, entityFilter, setEntityFilter,
  paginatedRecords, filteredRecords, selectedKey, setSelectedKey, setCurrentPage,
}) {
  return (
    <aside className="rounded-2xl border border-slate-100 bg-white shadow-sm px-5 py-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className={KICKER_CLASS}>Directory</p>
          <h3 className="mt-0.5 text-base font-bold text-slate-900">Choose a record</h3>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
          {filteredRecords.length} records
        </span>
      </div>

      {/* Type filter */}
      <div className="mb-3 flex gap-2">
        {["all","lead","customer"].map(type => (
          <button
            key={type} type="button"
            onClick={() => setEntityFilter(type)}
            className={`flex-1 rounded-xl border py-2 text-xs font-bold transition ${
              entityFilter === type
                ? "border-amber-300 bg-amber-50 text-amber-900"
                : "border-slate-200 bg-white text-slate-600 hover:border-amber-200"
            }`}
          >
            {TYPE_ICON[type]} {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <DashboardIcon name="leads" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-50"
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search company, contact, email…"
        />
      </div>

      {/* Record cards */}
      <div className="space-y-2 max-h-[520px] overflow-y-auto pr-0.5">
        {paginatedRecords.length ? paginatedRecords.map(record => {
          const isActive = record.key === selectedKey;
          return (
            <button
              key={record.key} type="button"
              onClick={() => setSelectedKey(record.key)}
              className={`group relative w-full overflow-hidden rounded-2xl border px-4 py-3.5 text-left transition hover:-translate-y-0.5 ${
                isActive
                  ? "border-amber-300 bg-amber-50 shadow-sm"
                  : "border-slate-100 bg-white hover:border-amber-200 hover:shadow-sm"
              }`}
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{record.entity_type === "lead" ? "🎯" : "🏢"}</span>
                    <p className="truncate text-sm font-bold text-slate-900">{record.subtitle}</p>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-400">{record.title}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-400">{record.email || record.phone || "No contact"}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                  isActive ? "border-amber-300 bg-white text-amber-800" : "border-slate-200 bg-slate-50 text-slate-500"
                }`}>{record.status}</span>
              </div>
            </button>
          );
        }) : (
          <div className="flex min-h-[160px] items-center justify-center text-center text-sm text-slate-400">
            No records matched the search.
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredRecords.length > 0 ? (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-50 pt-3">
          <span className="text-xs text-slate-400">Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            <button className={GHOST} type="button" onClick={() => setCurrentPage(Math.max(1, currentPage-1))} disabled={currentPage===1}>← Prev</button>
            <button className={GOLD}  type="button" onClick={() => setCurrentPage(Math.min(totalPages, currentPage+1))} disabled={currentPage===totalPages}>Next →</button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
