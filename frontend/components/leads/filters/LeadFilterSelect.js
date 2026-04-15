"use client";

export default function LeadFilterSelect({
  label,
  value,
  onChange,
  options = [],
  disabled = false,
  helperText = "",
  kickerClassName,
  inputClassName,
}) {
  return (
    <label className="space-y-2">
      <span className={kickerClassName}>{label}</span>
      <select
        className={inputClassName}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText ? <p className="text-xs font-medium text-[#8f816a]">{helperText}</p> : null}
    </label>
  );
}
