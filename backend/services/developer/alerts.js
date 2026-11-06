const db = require("../../db/connection");
const { createPrefixedId } = require("../../utils/ids");
const { escapeHtml, getFrontendUrl } = require("../emailService");
const { VERIFIED_SQL } = require("../auth/loginOtp");
const access = require("./access");

// Tells the company admins when a lead link, an API key or a webhook keeps failing,
// so lost leads are noticed the same hour. One email per problem every 6 hours.
const WINDOW_MINUTES = 60;
const MIN_FAILURES = 5;
const REPEAT_HOURS = 6;

async function findProblems() {
  const [requests] = await db.query(
    `SELECT company_id, kind, source_id, MAX(source_name) AS source_name,
            SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) AS failed, COUNT(*) AS total,
            MAX(CASE WHEN status >= 400 THEN message END) AS last_error
     FROM developer_request_log
     WHERE created_at >= DATEADD(minute, ?, SYSUTCDATETIME()) AND source_id IS NOT NULL AND status NOT IN (429)
     GROUP BY company_id, kind, source_id
     HAVING SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) >= ?`,
    [-WINDOW_MINUTES, MIN_FAILURES]
  );
  const [hooks] = await db.query(
    `SELECT company_id, webhook_id, name, url, disabled_reason FROM developer_webhooks
     WHERE (is_active = 0 AND disabled_reason IS NOT NULL AND last_failure_at >= DATEADD(day, -1, SYSUTCDATETIME()))
        OR (is_active = 1 AND failure_streak >= 5)`
  );
  return [
    ...requests.filter((r) => r.failed / Math.max(r.total, 1) >= 0.5).map((r) => ({
      companyId: r.company_id,
      key: `${r.kind}:${r.source_id}`,
      title: r.kind === "capture" ? `Lead link "${r.source_name}" is failing` : `API key "${r.source_name}" is failing`,
      text: `${r.failed} of ${r.total} requests failed in the last hour.${r.last_error ? ` Last error: ${r.last_error}` : ""}`,
      tab: "activity",
    })),
    ...hooks.map((h) => ({
      companyId: h.company_id,
      key: `webhook:${h.webhook_id}:${h.disabled_reason ? "off" : "failing"}`,
      title: h.disabled_reason ? `Webhook "${h.name}" was switched off` : `Webhook "${h.name}" keeps failing`,
      text: h.disabled_reason || `Calls to ${h.url} keep failing. GreenCRM keeps trying, and switches it off after 25 failures in a row.`,
      tab: "webhooks",
    })),
  ];
}

async function claim(companyId, key) {
  const [rows] = await db.query(
    `MERGE developer_alerts AS t USING (SELECT ? AS company_id, ? AS alert_key) AS s
       ON t.company_id = s.company_id AND t.alert_key = s.alert_key
     WHEN MATCHED AND t.sent_at < DATEADD(hour, ?, SYSUTCDATETIME()) THEN UPDATE SET sent_at = SYSUTCDATETIME()
     WHEN NOT MATCHED THEN INSERT (company_id, alert_key) VALUES (s.company_id, s.alert_key)
     OUTPUT $action AS action;`,
    [companyId, key, -REPEAT_HOURS]
  );
  return rows.length > 0;
}

async function adminsOf(companyId) {
  const [rows] = await db.query(
    `SELECT u.user_id, u.name, u.email, CASE WHEN ${VERIFIED_SQL("u")} THEN 1 ELSE 0 END AS verified
     FROM users u WHERE u.company_id = ? AND u.role = 'admin' AND u.is_active = 1`,
    [companyId]
  );
  return rows;
}

async function notify(problem, deps) {
  const admins = await adminsOf(problem.companyId);
  const link = `${getFrontendUrl()}/developer?tab=${problem.tab}`;
  let emailed = 0;
  for (const admin of admins) {
    await db.query(
      "INSERT INTO notifications (notif_id, company_id, user_id, title, message, type, priority, actionable) VALUES (?, ?, ?, ?, ?, 'system', 'high', 1)",
      [await createPrefixedId("ntf"), problem.companyId, admin.user_id, problem.title, problem.text]
    ).catch((error) => console.warn("[developer alerts] notification skipped:", error.message));
    if (!admin.verified || !admin.email) continue;
    const result = await deps.sendBranded(problem.companyId, {
      to: admin.email,
      subject: `Action needed: ${problem.title}`,
      preheader: problem.text,
      heading: problem.title,
      text: `Hi ${admin.name || ""},\n\n${problem.text}\n\nLeads may not be reaching GreenCRM. Open the Developer page to see what went wrong: ${link}`,
      body: `<p>Hi ${escapeHtml(admin.name || "")},</p><p>${escapeHtml(problem.text)}</p><p>Leads may not be reaching GreenCRM. Open the Developer page to see each failed request and its reason.</p>`,
      buttons: deps.button("Open Developer page", link),
    }).catch((error) => ({ error: error.message }));
    if (result?.sent || result?.delivery === "email") emailed += 1;
  }
  return emailed;
}

/** One pass of the alert check. */
async function checkAndAlert(deps = {}) {
  const mail = deps.sendBranded ? deps : require("../mail/brandedEmail");
  let sent = 0;
  for (const problem of await findProblems()) {
    if (!(await access.isEnabled(problem.companyId))) continue;
    if (!(await claim(problem.companyId, problem.key))) continue;
    sent += await notify(problem, { sendBranded: mail.sendBranded, button: mail.button });
  }
  return { sent };
}

module.exports = { checkAndAlert, findProblems };
