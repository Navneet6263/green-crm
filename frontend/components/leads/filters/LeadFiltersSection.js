"use client";

import { useState } from "react";
import LeadDateFilters from "./LeadDateFilters";
import LeadFilterActions from "./LeadFilterActions";
import LeadFilterSelect from "./LeadFilterSelect";
import LeadSearchInput from "./LeadSearchInput";

export default function LeadFiltersSection({
  search, onSearchChange, searchPlaceholder, filters, dateFilters,
  activeCount, onReset, resetDisabled, onExportCsv, onExportExcel, onExportHtml,
  exportDisabled, exportingCsv, exportingExcel, exportingHtml, kickerClassName, inputClassName, buttonClassName,
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      {/* Always-visible search + filter toggle */}
      <div className="flex gap-2">
        <div className="flex-1">
          <LeadSearchInput value={search} onChange={onSearchChange} placeholder={searchPlaceholder} />
        </div>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-[13px] font-semibold transition ${
            open || activeCount
              ? "border-amber-300 bg-amber-50 text-amber-900"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
          }`}
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h3a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
          Filters
          {activeCount ? (
            <span className="grid h-4 w-4 place-items-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          ) : null}
        </button>
      </div>

      {/* Collapsible filter panel */}
      {open ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="grid gap-3 sm:grid-cols-2">
              {filters.map(filter => (
                <LeadFilterSelect
                  key={filter.key}
                  label={filter.label}
                  value={filter.value}
                  onChange={filter.onChange}
                  options={filter.options}
                  disabled={filter.disabled}
                  helperText={filter.helperText}
                  isTextInput={filter.isTextInput}
                  placeholder={filter.placeholder}
                  kickerClassName={kickerClassName}
                  inputClassName={inputClassName}
                />
              ))}
            </div>
            <div className="space-y-3">
              <LeadDateFilters
                preset={dateFilters.preset}
                onPresetChange={dateFilters.onPresetChange}
                presetOptions={dateFilters.presetOptions}
                fromDate={dateFilters.fromDate}
                onFromDateChange={dateFilters.onFromDateChange}
                toDate={dateFilters.toDate}
                onToDateChange={dateFilters.onToDateChange}
                kickerClassName={kickerClassName}
                inputClassName={inputClassName}
              />
              <LeadFilterActions
                activeCount={activeCount}
                onReset={onReset}
                disabled={resetDisabled}
                onExportCsv={onExportCsv}
                onExportExcel={onExportExcel}
                onExportHtml={onExportHtml}
                exportDisabled={exportDisabled}
                exportingCsv={exportingCsv}
                exportingExcel={exportingExcel}
                exportingHtml={exportingHtml}
                buttonClassName={buttonClassName}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
