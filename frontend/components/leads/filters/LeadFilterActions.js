"use client";

export default function LeadFilterActions({ activeCount, buttonClassName, disabled, exportDisabled, exportingCsv, onExportCsv, onReset }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
      <p className="text-[13px] font-medium text-slate-600">{activeCount ? `${activeCount} filter${activeCount === 1 ? "" : "s"} on` : "No filters on"}</p>
      <div className="flex flex-wrap gap-2">
        <button className={buttonClassName} type="button" onClick={onExportCsv} disabled={exportDisabled || exportingCsv}>{exportingCsv ? "Exporting…" : "CSV"}</button>
        <button className={buttonClassName} type="button" onClick={onReset} disabled={disabled}>Clear filters</button>
      </div>
    </div>
  );
}
