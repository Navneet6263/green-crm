const DAY_MS = 24 * 60 * 60 * 1000;

export function titleize(value = "") {
  return String(value || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ensureCurrentOption(options = [], value = "", fallbackLabel = "") {
  if (!value || value === "all" || options.some((option) => option.value === value)) {
    return options;
  }

  return [{ value, label: fallbackLabel || titleize(value) }, ...options];
}

export function buildLeadSourceOptions(items = [], currentValue = "") {
  const map = new Map();

  (items || []).forEach((lead) => {
    const source = String(lead?.lead_source || "").trim();
    if (!source) {
      return;
    }

    const key = source.toLowerCase();
    const current = map.get(key) || { value: source, label: titleize(source), count: 0 };
    current.count += 1;
    map.set(key, current);
  });

  const options = [...map.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map(({ count, ...option }) => ({ ...option, label: `${option.label} (${count})` }));

  return ensureCurrentOption(options, currentValue);
}

export function formatDateInputValue(value = "") {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function getDatePresetRange(preset, now = new Date()) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  if (preset === "all") {
    return { from: "", to: "" };
  }

  if (preset === "today") {
    const value = formatDateInputValue(today);
    return { from: value, to: value };
  }

  if (preset === "last-7" || preset === "last-30") {
    const offset = preset === "last-7" ? 6 : 29;
    const from = new Date(today.getTime() - offset * DAY_MS);
    return { from: formatDateInputValue(from), to: formatDateInputValue(today) };
  }

  if (preset === "this-month") {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: formatDateInputValue(from), to: formatDateInputValue(today) };
  }

  if (preset === "last-month") {
    const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const to = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: formatDateInputValue(from), to: formatDateInputValue(to) };
  }

  return null;
}
