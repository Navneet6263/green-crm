"use client";

import LeadDateFilters from "./LeadDateFilters";
import LeadFilterActions from "./LeadFilterActions";
import LeadFilterSelect from "./LeadFilterSelect";
import LeadSearchInput from "./LeadSearchInput";

export default function LeadFiltersSection({
  search,
  onSearchChange,
  searchPlaceholder,
  filters,
  dateFilters,
  activeCount,
  onReset,
  resetDisabled,
  onExportCsv,
  onExportExcel,
  exportDisabled,
  exportingCsv,
  exportingExcel,
  kickerClassName,
  inputClassName,
  buttonClassName,
}) {
  return (
    <div className="rounded-[30px] border border-[#eadfcd] bg-white/88 p-5 shadow-[0_16px_34px_rgba(79,58,22,0.06)]">
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <LeadSearchInput value={search} onChange={onSearchChange} placeholder={searchPlaceholder} />
          <div className="grid gap-3 sm:grid-cols-2">
            {filters.map((filter) => (
              <LeadFilterSelect
                key={filter.key}
                label={filter.label}
                value={filter.value}
                onChange={filter.onChange}
                options={filter.options}
                disabled={filter.disabled}
                helperText={filter.helperText}
                kickerClassName={kickerClassName}
                inputClassName={inputClassName}
              />
            ))}
          </div>
        </div>
        <div className="space-y-4">
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
            exportDisabled={exportDisabled}
            exportingCsv={exportingCsv}
            exportingExcel={exportingExcel}
            buttonClassName={buttonClassName}
          />
        </div>
      </div>
    </div>
  );
}
