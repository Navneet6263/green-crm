const crypto = require("node:crypto");
const db = require("../../db/connection");
const AppError = require("../../utils/appError");

// Idempotency-Key: when an app sends the same POST/PATCH again (say after a timeout), it gets the
// first answer back instead of a second lead. Keys are kept for 24 hours, per company.
const KEY_PATTERN = /^[A-Za-z0-9._:-]{8,100}$/;
const KEEP_HOURS = 24;
let writes = 0;

const hashRequest = (req) => crypto.createHash("sha256")
  .update(`${req.method} ${req.originalUrl.split("?")[0]} ${JSON.stringify(req.body ?? null)}`).digest("hex");

async function claim(companyId, key, hash) {
  try {
    await db.query("INSERT INTO developer_idempotency (company_id, idem_key, request_hash) VALUES (?, ?, ?)", [companyId, key, hash]);
    return null;
  } catch (error) {
    const [rows] = await db.query(
      `SELECT TOP 1 request_hash, status, response_json, created_at FROM developer_idempotency
       WHERE company_id = ? AND idem_key = ? AND created_at >= DATEADD(hour, ?, SYSUTCDATETIME())`,
      [companyId, key, -KEEP_HOURS]
    );
    if (rows[0]) return rows[0];
    // An old row with the same key: replace it and carry on.
    await db.query("DELETE FROM developer_idempotency WHERE company_id = ? AND idem_key = ?", [companyId, key]);
    await db.query("INSERT INTO developer_idempotency (company_id, idem_key, request_hash) VALUES (?, ?, ?)", [companyId, key, hash]);
    return null;
  }
}

/** Express middleware for POST and PATCH on the API (after the key is checked). */
async function idempotency(req, res, next) {
  try {
    if (!["POST", "PATCH"].includes(req.method)) return next();
    const key = String(req.headers["idempotency-key"] || "").trim();
    if (!key) return next();
    if (!KEY_PATTERN.test(key)) {
      throw new AppError("Idempotency-Key must be 8 to 100 letters, numbers or . _ : -", 400, null, "IDEMPOTENCY_KEY_INVALID");
    }
    const companyId = req.auth.companyId;
    const hash = hashRequest(req);
    const previous = await claim(companyId, key, hash);
    if (previous) {
      if (previous.request_hash !== hash) {
        throw new AppError("This Idempotency-Key was already used for a different request.", 422, null, "IDEMPOTENCY_KEY_REUSED");
      }
      if (!previous.status) {
        throw new AppError("The first request with this Idempotency-Key is still running. Try again in a moment.", 409, null, "IDEMPOTENCY_IN_PROGRESS");
      }
      res.set("Idempotent-Replayed", "true");
      req.developer.message = "Repeated request, first answer sent again";
      return res.status(previous.status).json(JSON.parse(previous.response_json));
    }

    const send = res.json.bind(res);
    res.json = (payload) => {
      const status = res.statusCode;
      // A server error is not saved, so the app can try again with the same key.
      const save = status < 500
        ? db.query("UPDATE developer_idempotency SET status = ?, response_json = ? WHERE company_id = ? AND idem_key = ?", [status, JSON.stringify(payload), companyId, key])
        : db.query("DELETE FROM developer_idempotency WHERE company_id = ? AND idem_key = ?", [companyId, key]);
      save.catch((error) => console.warn("[developer] idempotency save skipped:", error.message));
      return send(payload);
    };
    writes += 1;
    if (writes % 200 === 0) {
      db.query("DELETE FROM developer_idempotency WHERE created_at < DATEADD(hour, ?, SYSUTCDATETIME())", [-KEEP_HOURS * 2]).catch(() => {});
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { KEY_PATTERN, hashRequest, idempotency };
