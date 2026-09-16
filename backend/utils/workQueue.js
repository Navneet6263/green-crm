const { getIndiaDayStartUtc } = require("./indiaDateBuckets");

function buildDuePredicate(column, bucket, now = new Date()) {
  const start = getIndiaDayStartUtc(now);
  const end = new Date(start.getTime() + 86400000);
  if (bucket === "today") return { clause: `${column} >= ? AND ${column} < ?`, params: [start, end] };
  if (bucket === "upcoming") return { clause: `${column} >= ?`, params: [end] };
  if (bucket === "unscheduled") return { clause: `${column} IS NULL`, params: [] };
  return { clause: `${column} < ?`, params: [start] };
}

module.exports = { buildDuePredicate };
