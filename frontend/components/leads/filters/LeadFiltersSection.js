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
  kickerClassName,
  inputClassName,
  buttonClassName,
}) {
  return (
    <div className="rounded-[28px] border border-[#eadfcd] bg-white/82 p-4 shadow-[0_14px_30px_rgba(79,58,22,0.05)] md:p-5">
      <LeadSearchInput value={search} onChange={onSearchChange} placeholder={searchPlaceholder} />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
      <div className="mt-4">
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
      </div>
      <div className="mt-4">
        <LeadFilterActions
          activeCount={activeCount}
          onReset={onReset}
          disabled={resetDisabled}
          buttonClassName={buttonClassName}
        />
      </div>
    </div>
  );
}
