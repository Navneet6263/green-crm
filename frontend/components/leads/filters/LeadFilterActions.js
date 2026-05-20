"use client";

export default function LeadFilterActions({
  activeCount,
  buttonClassName,
  disabled,
  exportDisabled,
  exportingCsv,
  exportingExcel,
  exportingHtml,
  onExportCsv,
  onExportExcel,
  onExportHtml,
  onReset,
}) {
  const busy = exportingCsv || exportingExcel || exportingHtml;
  return (
    <div className="rounded-[24px] border border-[#efe6d8] bg-[#fffaf1] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#9a886d]">Filter Actions</p>
          <p className="mt-2 text-sm font-semibold text-[#5d503c]">
            {activeCount ? `${activeCount} filters active.` : "Showing your current lead scope."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={buttonClassName} type="button" onClick={onExportCsv} disabled={exportDisabled || busy}>
            {exportingCsv ? "Exporting..." : "Export CSV"}
          </button>
          <button className={buttonClassName} type="button" onClick={onExportExcel} disabled={exportDisabled || busy}>
            {exportingExcel ? "Exporting..." : "Export XLS"}
          </button>
          <button className={buttonClassName} type="button" onClick={onExportHtml} disabled={exportDisabled || busy}>
            {exportingHtml ? "Exporting..." : "Export HTML Sheet"}
          </button>
          <button className={buttonClassName} type="button" onClick={onReset} disabled={disabled}>
            Reset Filters
          </button>
        </div>
      </div>
    </div>
  );
}
