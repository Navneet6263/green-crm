const crypto = require("node:crypto");
const db = require("../../db/connection");
const AppError = require("../../utils/appError");
const { assertPublicUrl } = require("./safeUrl");

// Outgoing webhooks: GreenCRM calls the company's own address when a lead changes.
// Each call is signed with the webhook's secret so the receiver can check it came from us.
const EVENTS = {
  "lead.created": "A new lead is added (by hand, import, lead link or API)",
  "lead.updated": "Any field of a lead changes",
  "lead.status_changed": "A lead moves to another status",
  "lead.assigned": "A lead gets a new owner",
  "lead.note_added": "Someone adds a note to a lead",
  "lead.deleted": "A lead is archived",
};
const MAX_WEBHOOKS = 10;
const CACHE_MS = 60 * 1000;
const cache = new Map();

const newSecret = () => `whsec_${crypto.randomBytes(24).toString("base64url")}`;

/** Header value: t=<unix seconds>,v1=<hex HMAC-SHA256 of "t.body">. */
function sign(secret, body, timestamp = Math.floor(Date.now() / 1000)) {
  const digest = crypto.createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

function parseEvents(value) {
  const list = [...new Set((Array.isArray(value) ? value : String(value || "").split(",")).map((e) => String(e).trim()).filter(Boolean))];
  if (!list.length) throw new AppError("Pick at least one event.", 400);
  const unknown = list.filter((e) => !EVENTS[e]);
  if (unknown.length) throw new AppError(`Unknown event: ${unknown.join(", ")}`, 400);
  return Object.keys(EVENTS).filter((e) => list.includes(e));
}

function publicWebhook(row, stats = {}) {
  return {
    webhook_id: row.webhook_id,
    name: row.name,
    url: row.url,
    events: String(row.events || "").split(",").filter(Boolean),
    secret: row.secret,
    is_active: Boolean(row.is_active),
    failure_streak: row.failure_streak || 0,
    disabled_reason: row.disabled_reason,
    last_success_at: row.last_success_at,
    last_failure_at: row.last_failure_at,
    created_at: row.created_at,
    sent_7d: Number(stats.sent || 0),
    failed_7d: Number(stats.failed || 0),
    pending: Number(stats.pending || 0),
  };
}

async function listWebhooks(companyId) {
  const [rows] = await db.query("SELECT * FROM developer_webhooks WHERE company_id = ? ORDER BY created_at DESC", [companyId]);
  const [stats] = await db.query(
    `SELECT webhook_id,
            SUM(CASE WHEN state = 'sent' THEN 1 ELSE 0 END) AS sent,
            SUM(CASE WHEN state IN ('failed', 'dead') THEN 1 ELSE 0 END) AS failed,
            SUM(CASE WHEN state IN ('pending', 'sending') THEN 1 ELSE 0 END) AS pending
     FROM developer_webhook_deliveries WHERE company_id = ? AND created_at >= DATEADD(day, -7, SYSUTCDATETIME())
     GROUP BY webhook_id`,
    [companyId]
  );
  const byId = new Map(stats.map((s) => [s.webhook_id, s]));
  return rows.map((row) => publicWebhook(row, byId.get(row.webhook_id)));
}

async function getWebhook(companyId, webhookId) {
  const [rows] = await db.query("SELECT * FROM developer_webhooks WHERE webhook_id = ? AND company_id = ?", [webhookId, companyId]);
  if (!rows.length) throw new AppError("Webhook not found.", 404);
  return rows[0];
}

async function createWebhook(auth, payload = {}) {
  const name = String(payload.name || "").trim().slice(0, 120) || "My app";
  const url = (await assertPublicUrl(payload.url)).toString();
  const events = parseEvents(payload.events);
  const [[count]] = await db.query("SELECT COUNT(*) AS total FROM developer_webhooks WHERE company_id = ?", [auth.companyId]);
  if (Number(count?.total || 0) >= MAX_WEBHOOKS) throw new AppError(`You can have ${MAX_WEBHOOKS} webhooks.`, 400);
  const webhookId = `wh_${crypto.randomBytes(8).toString("hex")}`;
  await db.query(
    "INSERT INTO developer_webhooks (webhook_id, company_id, name, url, events, secret, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [webhookId, auth.companyId, name, url, events.join(","), newSecret(), auth.userId]
  );
  cache.delete(auth.companyId);
  return publicWebhook(await getWebhook(auth.companyId, webhookId));
}

async function updateWebhook(auth, webhookId, payload = {}) {
  const current = await getWebhook(auth.companyId, webhookId);
  const has = (key) => Object.prototype.hasOwnProperty.call(payload, key);
  const name = has("name") ? String(payload.name || "").trim().slice(0, 120) || current.name : current.name;
  const url = has("url") ? (await assertPublicUrl(payload.url)).toString() : current.url;
  const events = has("events") ? parseEvents(payload.events).join(",") : current.events;
  const active = has("is_active") ? Boolean(payload.is_active) : Boolean(current.is_active);
  await db.query(
    `UPDATE developer_webhooks SET name = ?, url = ?, events = ?, is_active = ?,
       failure_streak = CASE WHEN ? = 1 AND is_active = 0 THEN 0 ELSE failure_streak END,
       disabled_reason = CASE WHEN ? = 1 THEN NULL ELSE disabled_reason END, updated_at = SYSUTCDATETIME()
     WHERE webhook_id = ? AND company_id = ?`,
    [name, url, events, active ? 1 : 0, active ? 1 : 0, active ? 1 : 0, webhookId, auth.companyId]
  );
  cache.delete(auth.companyId);
  return publicWebhook(await getWebhook(auth.companyId, webhookId));
}

async function rotateSecret(auth, webhookId) {
  await getWebhook(auth.companyId, webhookId);
  await db.query("UPDATE developer_webhooks SET secret = ?, updated_at = SYSUTCDATETIME() WHERE webhook_id = ? AND company_id = ?", [newSecret(), webhookId, auth.companyId]);
  cache.delete(auth.companyId);
  return publicWebhook(await getWebhook(auth.companyId, webhookId));
}

async function deleteWebhook(auth, webhookId) {
  const hook = await getWebhook(auth.companyId, webhookId);
  await db.query("DELETE FROM developer_webhook_deliveries WHERE webhook_id = ? AND company_id = ?", [webhookId, auth.companyId]);
  await db.query("DELETE FROM developer_webhooks WHERE webhook_id = ? AND company_id = ?", [webhookId, auth.companyId]);
  cache.delete(auth.companyId);
  return { webhook_id: webhookId, name: hook.name };
}

/** Active webhooks of a company, cached for a minute so lead saves stay fast. */
async function activeFor(companyId) {
  const hit = cache.get(companyId);
  if (hit && hit.until > Date.now()) return hit.rows;
  const [rows] = await db.query("SELECT webhook_id, events FROM developer_webhooks WHERE company_id = ? AND is_active = 1", [companyId]);
  cache.set(companyId, { rows, until: Date.now() + CACHE_MS });
  return rows;
}

async function listDeliveries(companyId, query = {}) {
  const conditions = ["company_id = ?"];
  const params = [companyId];
  if (query.webhook_id) {
    conditions.push("webhook_id = ?");
    params.push(String(query.webhook_id));
  }
  if (["pending", "sent", "failed", "dead"].includes(query.state)) {
    conditions.push(query.state === "failed" ? "state IN ('failed', 'dead')" : "state = ?");
    if (query.state !== "failed") params.push(query.state);
  }
  const [rows] = await db.query(
    `SELECT TOP 100 id, webhook_id, event_id, event, state, attempts, response_status, error, duration_ms, next_attempt_at, created_at, sent_at
     FROM developer_webhook_deliveries WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC, id DESC`,
    params
  );
  return rows;
}

/** Sends a delivery again now (also a dead one). */
async function redeliver(auth, deliveryId) {
  const [rows] = await db.query(
    `UPDATE developer_webhook_deliveries SET state = 'pending', next_attempt_at = SYSUTCDATETIME(), error = NULL
     OUTPUT INSERTED.id WHERE id = ? AND company_id = ? AND state <> 'sending'`,
    [Number(deliveryId) || 0, auth.companyId]
  );
  if (!rows.length) throw new AppError("Delivery not found or being sent right now.", 404);
  return { id: rows[0].id, queued: true };
}

function forget(companyId) {
  cache.delete(companyId);
}

module.exports = { EVENTS, activeFor, createWebhook, deleteWebhook, forget, getWebhook, listDeliveries, listWebhooks, parseEvents, publicWebhook, redeliver, rotateSecret, sign, updateWebhook };
