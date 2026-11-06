const AppError = require("../../utils/appError");
const { getRedisClient } = require("../cache/cacheStore");

// Request limits for /api/v1. With Redis (REDIS_URL or REDIS_HOST) every server shares the
// same counters and they survive a restart; without it each server counts in memory.
const LIMITS = {
  keyPerMinute: Number(process.env.PUBLIC_API_PER_MINUTE || 120),
  companyPerDay: Number(process.env.PUBLIC_API_PER_DAY || 20000),
  addressPerMinute: 300,
  linkPerMinute: 60,
  visitorPer10Min: 120,
};
const memory = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of memory.entries()) if (bucket.resetAt <= now) memory.delete(key);
}, 60 * 1000).unref();

/** Counts one request in a fixed window; returns whether it is allowed and what is left. */
async function hit(key, windowSec, max) {
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const resetAt = Math.floor(now / windowMs) * windowMs + windowMs;
  const name = `gcrm:rl:${key}:${resetAt}`;
  let count = null;
  const client = await getRedisClient().catch(() => null);
  if (client) {
    try {
      const [incr] = await client.multi().incr(name).expire(name, windowSec + 5).exec();
      count = Number(incr);
    } catch (_error) {
      count = null;
    }
  }
  if (count === null) {
    const bucket = memory.get(name) || { count: 0, resetAt };
    bucket.count += 1;
    memory.set(name, bucket);
    count = bucket.count;
  }
  return { allowed: count <= max, limit: max, remaining: Math.max(max - count, 0), resetAt };
}

function tooMany(res, result, message) {
  const wait = Math.max(Math.ceil((result.resetAt - Date.now()) / 1000), 1);
  res.set("Retry-After", String(wait));
  return new AppError(`${message} Try again in ${wait} seconds.`, 429, { retry_after: wait }, "RATE_LIMITED");
}

/** Express middleware: a limit keyed by the request (`keyOf`), sending the standard headers when `headers` is set. */
function limit({ name, windowSec, max, keyOf, message, headers = false }) {
  return async (req, res, next) => {
    try {
      const result = await hit(`${name}:${keyOf(req)}`, windowSec, max);
      if (headers) {
        res.set("X-RateLimit-Limit", String(result.limit));
        res.set("X-RateLimit-Remaining", String(result.remaining));
        res.set("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));
      }
      if (!result.allowed) return next(tooMany(res, result, message));
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

const byAddress = limit({ name: "ip", windowSec: 60, max: LIMITS.addressPerMinute, keyOf: (req) => req.ip, message: "Too many requests from your address." });
const byKey = limit({ name: "key", windowSec: 60, max: LIMITS.keyPerMinute, keyOf: (req) => req.apiKey.keyId, message: "Too many requests for this key.", headers: true });
const byCompanyDay = limit({ name: "day", windowSec: 86400, max: LIMITS.companyPerDay, keyOf: (req) => req.auth.companyId, message: "Your company used today's API limit." });
const byVisitor = limit({ name: "cap-ip", windowSec: 600, max: LIMITS.visitorPer10Min, keyOf: (req) => req.ip, message: "Too many forms sent from your address." });
const byLink = limit({ name: "cap-link", windowSec: 60, max: LIMITS.linkPerMinute, keyOf: (req) => req.params.token, message: "This lead link is getting too many requests." });

module.exports = { LIMITS, byAddress, byCompanyDay, byKey, byLink, byVisitor, hit, limit };
