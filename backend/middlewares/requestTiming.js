const { randomUUID } = require("node:crypto");
const { performance } = require("node:perf_hooks");
const { storage } = require("../utils/requestMetrics");

function requestTiming(req, res, next) {
  const started = performance.now();
  const requestId = randomUUID();
  const metrics = { dbQueries: 0, dbMs: 0 };
  res.setHeader("X-Request-Id", requestId);
  const writeHead = res.writeHead;
  res.writeHead = function (...args) {
    if (!res.headersSent) res.setHeader("Server-Timing", `app;dur=${(performance.now()-started).toFixed(1)}, db;dur=${metrics.dbMs.toFixed(1)}`);
    return writeHead.apply(this, args);
  };
  res.once("finish", () => {
    const durationMs = performance.now() - started;
    const configured = Number(process.env.SLOW_API_THRESHOLD_MS || 1000);
    const threshold = Number.isFinite(configured) ? Math.max(configured, 0) : 1000;
    if (process.env.LOG_SLOW_API === "true" && durationMs >= threshold) {
      // Never log authorization, bodies, SQL, query strings or customer values.
      console.info(JSON.stringify({ event: "slow_api", request_id: requestId, method: req.method,
        route: req.route?.path || "unmatched", status: res.statusCode,
        duration_ms: Math.round(durationMs), db_queries: metrics.dbQueries, db_ms: Math.round(metrics.dbMs) }));
    }
  });
  storage.run(metrics, next);
}

module.exports = requestTiming;
