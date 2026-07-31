"use client";

import LeadFilterSelect from "./LeadFilterSelect";

export default function LeadDateFilters({
  preset,
  onPresetChange,
  presetOptions,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  dateFilterType,
  onDateFilterTypeChange,
  kickerClassName,
  inputClassName,
}) {
  return (
    <div className="grid gap-3">
      <LeadFilterSelect
        label="Filter date by"
        value={dateFilterType}
        onChange={onDateFilterTypeChange}
        options={[
          { value: "created_at", label: "Lead Created Date" },
          { value: "onboarded_date", label: "Onboarded Date" },
        ]}
        kickerClassName={kickerClassName}
        inputClassName={inputClassName}
      />
      <LeadFilterSelect
        label="Date preset"
        value={preset}
        onChange={onPresetChange}
        options={presetOptions}
        kickerClassName={kickerClassName}
        inputClassName={inputClassName}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-2">
          <span className={kickerClassName}>From date</span>
          <input
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(event) => onFromDateChange(event.target.value)}
            className={inputClassName}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-2">
          <span className={kickerClassName}>To date</span>
          <input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(event) => onToDateChange(event.target.value)}
            className={inputClassName}
          />
        </label>
      </div>
    </div>
  );
}
