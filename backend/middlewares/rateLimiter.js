const AppError = require("../utils/appError");

function createRateLimiter({ windowMs, max, keyGenerator }) {
  const hits = new Map();

  const cleanupInterval = setInterval(() => {
    const now = Date.now();

    for (const [key, bucket] of hits.entries()) {
      if (bucket.expiresAt <= now) {
        hits.delete(key);
      }
    }
  }, windowMs);

  cleanupInterval.unref();

  return function rateLimiter(req, _res, next) {
    const key = keyGenerator ? keyGenerator(req) : `${req.ip}:${req.path}`;
    const now = Date.now();
    const bucket = hits.get(key);

    if (!bucket || bucket.expiresAt <= now) {
      hits.set(key, { count: 1, expiresAt: now + windowMs });
      next();
      return;
    }

    bucket.count += 1;

    if (bucket.count > max) {
      next(
        new AppError(
          "Too many requests. For multi-instance deployments, replace the in-memory rate limiter with Redis.",
          429
        )
      );
      return;
    }

    next();
  };
}

const globalRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_PER_MINUTE || 180),
});

const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT || 20),
  keyGenerator: (req) => `${req.ip}:auth`,
});

module.exports = {
  authRateLimiter,
  createRateLimiter,
  globalRateLimiter,
};
