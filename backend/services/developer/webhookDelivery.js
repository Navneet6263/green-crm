const dns = require("node:dns");
const https = require("node:https");
const db = require("../../db/connection");
const access = require("./access");
const { isPrivate, parseUrl } = require("./safeUrl");
const { sign } = require("./webhooks");

// Sends queued webhook calls. A call that does not get a 2xx answer is tried again later
// (1 min, 5 min, 30 min, 2 h, 6 h, 24 h), then given up. 25 give-ups in a row switch the webhook off.
const RETRY_MINUTES = [1, 5, 30, 120, 360, 1440];
const TIMEOUT_MS = 10 * 1000;
const BATCH = 40;
const DISABLE_AFTER = 25;

// Resolves the name and refuses private addresses at connect time, so a name cannot be
// switched to an inside address between the check and the call.
function guardedLookup(hostname, options, callback) {
  dns.lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error);
    const list = Array.isArray(addresses) ? addresses : [{ address: addresses, family: options.family || 4 }];
    if (!list.length || list.some((entry) => isPrivate(entry.address))) {
      return callback(new Error("The webhook address points inside a private network."));
    }
    return options.all ? callback(null, list) : callback(null, list[0].address, list[0].family);
  });
}

/** One HTTPS POST. Resolves { status, ms } or { error, ms }; never follows redirects. */
function post(urlText, body, headers, deps = {}) {
  const started = Date.now();
  return new Promise((resolve) => {
    let url;
    try {
      url = parseUrl(urlText);
    } catch (error) {
      resolve({ error: error.message, ms: 0 });
      return;
    }
    const request = (deps.request || https.request)(url, {
      method: "POST",
      headers: { ...headers, "Content-Length": Buffer.byteLength(body) },
      lookup: deps.lookup || guardedLookup,
      timeout: TIMEOUT_MS,
    }, (response) => {
      response.resume();
      response.on("end", () => resolve({ status: response.statusCode, ms: Date.now() - started }));
    });
    request.on("timeout", () => request.destroy(new Error(`No answer in ${TIMEOUT_MS / 1000} seconds`)));
    request.on("error", (error) => resolve({ error: error.message.slice(0, 250), ms: Date.now() - started }));
    request.end(body);
  });
}

async function claimDue() {
  const [rows] = await db.query(
    `UPDATE TOP (${BATCH}) d SET state = 'sending', attempts = attempts + 1, next_attempt_at = SYSUTCDATETIME()
     OUTPUT INSERTED.id, INSERTED.webhook_id, INSERTED.company_id, INSERTED.event_id, INSERTED.event, INSERTED.payload, INSERTED.attempts
     FROM developer_webhook_deliveries d
     WHERE d.state IN ('pending', 'failed') AND d.next_attempt_at <= SYSUTCDATETIME()`
  );
  return rows;
}

async function finish(delivery, hook, result) {
  const ok = result.status >= 200 && result.status < 300;
  const error = ok ? null : result.error || `Answered ${result.status}`;
  if (ok) {
    await db.query(
      "UPDATE developer_webhook_deliveries SET state = 'sent', response_status = ?, error = NULL, duration_ms = ?, sent_at = SYSUTCDATETIME() WHERE id = ?",
      [result.status, result.ms, delivery.id]
    );
    await db.query("UPDATE developer_webhooks SET failure_streak = 0, last_success_at = SYSUTCDATETIME() WHERE webhook_id = ?", [hook.webhook_id]);
    return "sent";
  }
  const wait = RETRY_MINUTES[delivery.attempts - 1];
  const state = wait === undefined ? "dead" : "failed";
  await db.query(
    `UPDATE developer_webhook_deliveries SET state = ?, response_status = ?, error = ?, duration_ms = ?,
       next_attempt_at = DATEADD(minute, ?, SYSUTCDATETIME()) WHERE id = ?`,
    [state, result.status || null, String(error).slice(0, 300), result.ms, wait || 0, delivery.id]
  );
  if (state === "dead") {
    const [rows] = await db.query(
      `UPDATE developer_webhooks SET failure_streak = failure_streak + 1, last_failure_at = SYSUTCDATETIME(),
         is_active = CASE WHEN failure_streak + 1 >= ? THEN 0 ELSE is_active END,
         disabled_reason = CASE WHEN failure_streak + 1 >= ? THEN ? ELSE disabled_reason END
       OUTPUT INSERTED.is_active WHERE webhook_id = ?`,
      [DISABLE_AFTER, DISABLE_AFTER, `Switched off after ${DISABLE_AFTER} calls failed in a row. Last error: ${String(error).slice(0, 150)}`, hook.webhook_id]
    );
    if (rows[0] && !rows[0].is_active) require("./webhooks").forget(hook.company_id);
  } else {
    await db.query("UPDATE developer_webhooks SET last_failure_at = SYSUTCDATETIME() WHERE webhook_id = ?", [hook.webhook_id]);
  }
  return state;
}

/** One pass of the job. Returns counts by result. */
async function sendDue(deps = {}) {
  const due = await claimDue();
  const counts = { sent: 0, failed: 0, dead: 0, skipped: 0 };
  if (!due.length) return counts;
  const ids = [...new Set(due.map((d) => d.webhook_id))];
  const [hooks] = await db.query(
    `SELECT webhook_id, company_id, url, secret, is_active FROM developer_webhooks WHERE webhook_id IN (${ids.map(() => "?").join(", ")})`,
    ids
  );
  const byId = new Map(hooks.map((h) => [h.webhook_id, h]));
  for (const delivery of due) {
    const hook = byId.get(delivery.webhook_id);
    const off = !hook || (!hook.is_active && delivery.event !== "ping") || !(await access.isEnabled(hook.company_id));
    if (off) {
      await db.query("UPDATE developer_webhook_deliveries SET state = 'dead', error = 'Webhook or Developer API switched off' WHERE id = ?", [delivery.id]);
      counts.skipped += 1;
      continue;
    }
    const body = delivery.payload;
    const result = await post(hook.url, body, {
      "Content-Type": "application/json",
      "User-Agent": "GreenCRM-Webhooks/1.0",
      "X-GreenCRM-Event": delivery.event,
      "X-GreenCRM-Delivery": String(delivery.id),
      "X-GreenCRM-Event-Id": delivery.event_id,
      "X-GreenCRM-Signature": sign(hook.secret, body),
    }, deps);
    counts[await finish(delivery, hook, result)] += 1;
  }
  return counts;
}

/** Deliveries stuck in "sending" (server stopped mid-call) go back to the queue; old rows are removed. */
async function tidy() {
  await db.query("UPDATE developer_webhook_deliveries SET state = 'failed', next_attempt_at = SYSUTCDATETIME() WHERE state = 'sending' AND next_attempt_at < DATEADD(minute, -15, SYSUTCDATETIME())");
  await db.query("DELETE FROM developer_webhook_deliveries WHERE created_at < DATEADD(day, -30, SYSUTCDATETIME())");
}

module.exports = { RETRY_MINUTES, guardedLookup, post, sendDue, tidy };
