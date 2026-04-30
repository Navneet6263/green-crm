"use client";

export default function LeadFilterSelect({
  label,
  value,
  onChange,
  options = [],
  disabled = false,
  helperText = "",
  isTextInput = false,
  placeholder = "",
  kickerClassName,
  inputClassName,
}) {
  return (
    <label className="space-y-2">
      <span className={kickerClassName}>{label}</span>
      {isTextInput ? (
        <input
          type="text"
          className={inputClassName}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          placeholder={placeholder}
        />
      ) : (
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
      )}
      {helperText ? <p className="text-xs font-medium text-[#8f816a]">{helperText}</p> : null}
    </label>
  );
}
