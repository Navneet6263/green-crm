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

function buildIndiaDayBucketsForRange(fromIso, toIso) {
  const fromDate = new Date(`${fromIso}T00:00:00Z`);
  const toDate = new Date(`${toIso}T00:00:00Z`);
  
  // Convert UTC midnights to India start times (just for calculation context if needed, but really we just need the boundaries)
  // Let's rely on getIndiaDayStartUtc to find the exact UTC bounds for these visual days.
  const fromStartUtc = getIndiaDayStartUtc(new Date(fromDate.getTime() - INDIA_OFFSET_MINUTES * 60 * 1000));
  const toStartUtc = getIndiaDayStartUtc(new Date(toDate.getTime() - INDIA_OFFSET_MINUTES * 60 * 1000));
  
  let diffDays = Math.round((toStartUtc - fromStartUtc) / DAY_MS) + 1;
  // Cap at 90 days to avoid massive arrays/DB queries if someone queries 10 years
  diffDays = Math.min(Math.max(1, diffDays), 90);
  
  // We use `toDate` (or `toIso`) as the reference date so it walks backwards from there
  // Actually, wait, `buildIndiaDayBuckets` takes the `reference` which dictates `todayStartUtc`.
  // If we pass `toStartUtc + 12 hours` as reference, `getIndiaDayStartUtc` will yield `toStartUtc`.
  const refDate = new Date(toStartUtc.getTime() + 12 * 60 * 60 * 1000); // midday UTC guarantees it falls on the correct India day
  
  return buildIndiaDayBuckets(diffDays, refDate);
}

module.exports = {
  buildIndiaDayBuckets,
  buildIndiaDayBucketsForRange,
  getIndiaDayStartUtc,
};
