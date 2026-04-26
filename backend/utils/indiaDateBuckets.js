const INDIA_OFFSET_MINUTES = 330;
const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

function getIndiaDayStartUtc(reference = new Date()) {
  const shifted = new Date(reference.getTime() + INDIA_OFFSET_MINUTES * 60 * 1000);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - INDIA_OFFSET_MINUTES * 60 * 1000);
}

function buildIndiaDayLabel(date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function buildIndiaDayKey(date) {
  const shifted = new Date(date.getTime() + INDIA_OFFSET_MINUTES * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

function buildIndiaDayBuckets(days = 7, reference = new Date()) {
  const safeDays = Number.isFinite(Number(days)) ? Math.max(1, Number(days)) : 7;
  const todayStartUtc = getIndiaDayStartUtc(reference);

  return Array.from({ length: safeDays }, (_item, index) => {
    const offset = index - (safeDays - 1);
    const startUtc = addDays(todayStartUtc, offset);
    const endUtc = addDays(startUtc, 1);

    return {
      key: buildIndiaDayKey(startUtc),
      label: buildIndiaDayLabel(startUtc),
      startUtc,
      endUtc,
    };
  });
}

module.exports = {
  buildIndiaDayBuckets,
  getIndiaDayStartUtc,
};
