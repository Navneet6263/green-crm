const crypto = require("node:crypto");
const db = require("../../db/connection");
const access = require("./access");
const webhooks = require("./webhooks");
const { publicLead } = require("./leadShape");

// Lead changes become webhook deliveries. Saving a lead never waits for this or fails because of it:
// the rows are queued here and the webhook job sends them.

const newEventId = () => `evt_${crypto.randomBytes(10).toString("hex")}`;

function envelope(type, companyId, data) {
  return { id: newEventId(), type, created_at: new Date().toISOString(), company_id: companyId, data };
}

async function queue(companyId, type, data, onlyWebhookId = null) {
  if (!companyId) return 0;
  if (!(await access.isEnabled(companyId))) return 0;
  const hooks = onlyWebhookId
    ? [{ webhook_id: onlyWebhookId, events: type }]
    : (await webhooks.activeFor(companyId)).filter((hook) => String(hook.events).split(",").includes(type));
  for (const hook of hooks) {
    const event = envelope(type, companyId, data);
    await db.query(
      "INSERT INTO developer_webhook_deliveries (webhook_id, company_id, event_id, event, payload) VALUES (?, ?, ?, ?, ?)",
      [hook.webhook_id, companyId, event.id, type, JSON.stringify(event)]
    );
  }
  return hooks.length;
}

function fire(companyId, type, data) {
  queue(companyId, type, data).catch((error) => console.warn(`[webhooks] ${type} not queued:`, error.message));
}

const actorOf = (auth) => (auth ? { id: auth.userId, name: auth.name || null, via: auth.via || "crm" } : null);

function created(lead, auth) {
  if (lead?.company_id) fire(lead.company_id, "lead.created", { lead: publicLead(lead), actor: actorOf(auth) });
}

/** One lead.updated, plus lead.status_changed / lead.assigned when those changed. */
function updated(before, after, changes, auth) {
  if (!after?.company_id || !changes?.length) return;
  const lead = publicLead(after);
  const actor = actorOf(auth);
  fire(after.company_id, "lead.updated", { lead, changes: changes.map(({ label, before: from, after: to }) => ({ field: label, from, to })), actor });
  if (before.status !== after.status) fire(after.company_id, "lead.status_changed", { lead, from: before.status, to: after.status, actor });
  if (before.assigned_to !== after.assigned_to) fire(after.company_id, "lead.assigned", { lead, from: before.assigned_to || null, to: after.assigned_to || null, actor });
}

function noteAdded(lead, content, auth) {
  if (lead?.company_id) fire(lead.company_id, "lead.note_added", { lead: publicLead(lead), note: String(content || "").slice(0, 4000), actor: actorOf(auth) });
}

function deleted(lead, reason, auth) {
  if (lead?.company_id) fire(lead.company_id, "lead.deleted", { lead: { id: lead.lead_id, contact_person: lead.contact_person, company_name: lead.company_name }, reason: String(reason || ""), actor: actorOf(auth) });
}

/** A "ping" for the Send test button. */
function ping(companyId, webhookId, auth) {
  return queue(companyId, "ping", { message: "Test from GreenCRM. If you can read this, your webhook works.", actor: actorOf(auth) }, webhookId);
}

module.exports = { created, deleted, envelope, noteAdded, ping, queue, updated };
