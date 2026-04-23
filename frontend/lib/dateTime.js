export const INDIA_TIME_ZONE = "Asia/Kolkata";

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildDateOptions(withTime = false) {
  return withTime
    ? {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: INDIA_TIME_ZONE,
      }
    : {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: INDIA_TIME_ZONE,
      };
}

export function formatIndiaDateTime(value, withTime = false) {
  const date = normalizeDate(value);
  if (!date) {
    return "--";
  }

  return date.toLocaleString("en-IN", buildDateOptions(withTime));
}

export function formatIndiaDate(value) {
  return formatIndiaDateTime(value, false);
}

export function formatIndiaDateWithTime(value) {
  return formatIndiaDateTime(value, true);
}

export function formatIndiaCustom(value, options = {}) {
  const date = normalizeDate(value);
  if (!date) {
    return "--";
  }

  return date.toLocaleString("en-IN", {
    timeZone: INDIA_TIME_ZONE,
    ...options,
  });
}
