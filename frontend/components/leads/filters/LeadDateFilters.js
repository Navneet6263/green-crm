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
  kickerClassName,
  inputClassName,
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <LeadFilterSelect
        label="Date preset"
        value={preset}
        onChange={onPresetChange}
        options={presetOptions}
        kickerClassName={kickerClassName}
        inputClassName={inputClassName}
      />
      <label className="space-y-2">
        <span className={kickerClassName}>From date</span>
        <input
          type="date"
          value={fromDate}
          max={toDate || undefined}
          onChange={(event) => onFromDateChange(event.target.value)}
          className={inputClassName}
        />
      </label>
      <label className="space-y-2">
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
  );
}
