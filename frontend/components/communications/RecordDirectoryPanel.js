import DashboardIcon from "../dashboard/icons";

import { GHOST_BUTTON_CLASS, INPUT_CLASS, KICKER_CLASS, PANEL_CLASS } from "./constants";

export default function RecordDirectoryPanel({
  currentPage,
  totalPages,
  search,
  setSearch,
  entityFilter,
  setEntityFilter,
  paginatedRecords,
  filteredRecords,
  selectedKey,
  setSelectedKey,
  setCurrentPage,
}) {
  return (
    <aside className={PANEL_CLASS}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className={KICKER_CLASS}>Directory</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Choose a record</h3>
        </div>
        <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
          Page {currentPage} of {totalPages}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {["all", "lead", "customer"].map((type) => {
          const active = entityFilter === type;
          return (
            <button key={type} className={`inline-flex min-h-[46px] items-center justify-center rounded-[18px] border px-4 py-2.5 text-sm font-semibold transition ${active ? "border-[#d7b258] bg-[#f3dfab] text-[#060710]" : "border-[#eadfcd] bg-white text-[#5d503c]"}`} type="button" onClick={() => setEntityFilter(type)}>
              {type === "all" ? "All Records" : type === "lead" ? "Leads" : "Customers"}
            </button>
          );
        })}
      </div>

      <label className="mt-4 grid gap-2">
        <span className={KICKER_CLASS}>Search</span>
        <div className="relative">
          <DashboardIcon name="leads" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9c8e76]" />
          <input className={`${INPUT_CLASS} pl-11`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company, contact, email, or owner" />
        </div>
      </label>

      <div className="mt-4 space-y-3">
        {paginatedRecords.length ? paginatedRecords.map((record) => {
          const active = record.key === selectedKey;
          return (
            <button key={record.key} type="button" className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${active ? "border-[#d7b258] bg-[#fff6e4] shadow-[0_12px_28px_rgba(203,169,82,0.14)]" : "border-[#eadfcd] bg-[#fffaf1] hover:bg-white"}`} onClick={() => setSelectedKey(record.key)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <strong className="block text-base text-[#060710]">{record.title}</strong>
                  <p className="mt-1 text-sm text-[#6f614c]">{record.subtitle}</p>
                </div>
                <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">{record.status}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[#8f816a]">
                <span>{record.entity_type}</span>
                <span>{record.email || record.phone || "No direct contact"}</span>
              </div>
            </button>
          );
        }) : (
          <div className="rounded-[24px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-5 py-14 text-center text-sm text-[#7a6b57]">
            No records matched the current search.
          </div>
        )}
      </div>

      {filteredRecords.length ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-3">
          <span className="text-sm font-semibold text-[#7c6d55]">{filteredRecords.length} total records</span>
          <div className="flex gap-2">
            <button className={GHOST_BUTTON_CLASS} type="button" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>Previous</button>
            <button className={GHOST_BUTTON_CLASS} type="button" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>Next</button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
