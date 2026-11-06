const db = require("../../db/connection");

// Every API call and form post a company receives, kept 30 days for the Developer page.
const KEEP_DAYS = 30;
let writes = 0;

async function record(entry) {
  if (!entry?.companyId) return;
  await db.query(
    `INSERT INTO developer_request_log (company_id, kind, source_id, source_name, method, path, status, duration_ms, ip, message, lead_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.companyId, entry.kind, entry.sourceId || null, entry.sourceName ? String(entry.sourceName).slice(0, 120) : null,
      String(entry.method || "GET").slice(0, 8), String(entry.path || "").slice(0, 300), Number(entry.status) || 0,
      Number.isFinite(entry.durationMs) ? Math.round(entry.durationMs) : null, String(entry.ip || "").slice(0, 64) || null,
      entry.message ? String(entry.message).slice(0, 300) : null, entry.leadId || null,
    ]
  );
  writes += 1;
  if (writes % 500 === 0) {
    await db.query("DELETE FROM developer_request_log WHERE created_at < DATEADD(day, ?, SYSUTCDATETIME())", [-KEEP_DAYS]);
  }
}

/** Express middleware: logs the request when it finishes, once req.developer names the company. */
function logRequests(kind) {
  return (req, res, next) => {
    const started = process.hrtime.bigint();
    res.on("finish", () => {
      const info = req.developer || {};
      record({
        companyId: info.companyId, kind, sourceId: info.sourceId, sourceName: info.sourceName,
        method: req.method, path: (req.originalUrl || "").split("?")[0].replace(/lc_[A-Za-z0-9_-]{24}/, "lc_…"),
        status: res.statusCode, durationMs: Number(process.hrtime.bigint() - started) / 1e6, ip: req.ip,
        message: info.message || res.locals.errorMessage, leadId: info.leadId,
      }).catch((error) => console.warn("[developer] request log skipped:", error.message));
    });
    next();
  };
}

async function listRecent(companyId, query = {}) {
  const conditions = ["company_id = ?"];
  const params = [companyId];
  if (["api", "capture"].includes(query.kind)) {
    conditions.push("kind = ?");
    params.push(query.kind);
  }
  if (query.result === "ok") conditions.push("status < 400");
  if (query.result === "error") conditions.push("status >= 400");
  if (query.source_id) {
    conditions.push("source_id = ?");
    params.push(String(query.source_id));
  }
  const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 300);
  const [rows] = await db.query(
    `SELECT TOP ${limit} id, kind, source_id, source_name, method, path, status, duration_ms, ip, message, lead_id, created_at
     FROM developer_request_log WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC, id DESC`,
    params
  );
  return rows;
}

/** Daily counts for the last `days` days (IST), plus totals for the period. */
async function usage(companyId, days = 14) {
  const [rows] = await db.query(
    `SELECT CONVERT(date, DATEADD(minute, 330, created_at)) AS day, kind,
            SUM(CASE WHEN status < 400 THEN 1 ELSE 0 END) AS ok,
            SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) AS failed,
            SUM(CASE WHEN kind = 'capture' AND lead_id IS NOT NULL AND status < 400 THEN 1 ELSE 0 END) AS leads,
            AVG(CAST(duration_ms AS FLOAT)) AS avg_ms
     FROM developer_request_log
     WHERE company_id = ? AND created_at >= DATEADD(day, ?, SYSUTCDATETIME())
     GROUP BY CONVERT(date, DATEADD(minute, 330, created_at)), kind`,
    [companyId, -days]
  );
  const byDay = new Map();
  const today = new Date(Date.now() + 330 * 60000);
  for (let i = days - 1; i >= 0; i -= 1) {
    const key = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10);
    byDay.set(key, { day: key, api_ok: 0, api_failed: 0, capture_ok: 0, capture_failed: 0, leads: 0 });
  }
  const totals = { api: 0, capture: 0, failed: 0, leads: 0, avg_ms: 0 };
  let timed = 0;
  rows.forEach((row) => {
    const key = new Date(row.day).toISOString().slice(0, 10);
    const slot = byDay.get(key);
    const ok = Number(row.ok) || 0;
    const failed = Number(row.failed) || 0;
    if (slot) {
      slot[`${row.kind}_ok`] += ok;
      slot[`${row.kind}_failed`] += failed;
      slot.leads += Number(row.leads) || 0;
    }
    totals[row.kind] += ok + failed;
    totals.failed += failed;
    totals.leads += Number(row.leads) || 0;
    if (row.avg_ms !== null) {
      totals.avg_ms += Number(row.avg_ms) * (ok + failed);
      timed += ok + failed;
    }
  });
  totals.avg_ms = timed ? Math.round(totals.avg_ms / timed) : 0;
  return { days: [...byDay.values()], totals };
}

module.exports = { listRecent, logRequests, record, usage };
