const express = require("express");

const authenticate = require("../middlewares/authenticate");
const asyncHandler = require("../utils/asyncHandler");
const auditRepository = require("../repositories/auditRepository");
const { createPrefixedId } = require("../utils/ids");
const { requireDeveloperAdmin } = require("../services/developer/access");
const apiKeys = require("../services/developer/apiKeys");
const forms = require("../services/developer/captureForms");
const requestLog = require("../services/developer/requestLog");
const webhooks = require("../services/developer/webhooks");
const leadEvents = require("../services/developer/leadEvents");
const { LIMITS } = require("../services/developer/limits");

// The admin's Developer page: API keys, lead capture links, usage and the request log.
// Only a company admin, and only after the super admin switches Developer API on.
const router = express.Router();

router.use(asyncHandler(authenticate), requireDeveloperAdmin);

async function audit(req, action, entityId, details) {
  await auditRepository.createLog({
    audit_id: await createPrefixedId("aud"),
    company_id: req.auth.companyId,
    action,
    performed_by: req.auth.userId,
    entity_id: entityId,
    user_email: req.auth.email,
    user_role: req.auth.role,
    details,
  }).catch((error) => console.warn("[developer] audit skipped:", error.message));
}

router.get("/overview", asyncHandler(async (req, res) => {
  const [keys, links, usage, recent, hooks] = await Promise.all([
    apiKeys.listKeys(req.auth.companyId),
    forms.listForms(req.auth.companyId),
    requestLog.usage(req.auth.companyId, 14),
    requestLog.listRecent(req.auth.companyId, { limit: 8 }),
    webhooks.listWebhooks(req.auth.companyId),
  ]);
  res.json({ data: {
    enabled: true,
    keys: { active: keys.filter((k) => k.state === "active").length, total: keys.length },
    links: { active: links.filter((f) => f.is_active).length, total: links.length, leads: links.reduce((sum, f) => sum + f.lead_count, 0) },
    usage,
    recent,
    webhooks: { active: hooks.filter((h) => h.is_active).length, total: hooks.length, sent_7d: hooks.reduce((n, h) => n + h.sent_7d, 0), failed_7d: hooks.reduce((n, h) => n + h.failed_7d, 0) },
    limits: { per_minute: LIMITS.keyPerMinute, per_day: LIMITS.companyPerDay, page_size: 100, link_per_minute: LIMITS.linkPerMinute },
    events: webhooks.EVENTS,
    scopes: apiKeys.SCOPES,
    expiry_choices: apiKeys.EXPIRY_CHOICES,
  } });
}));

router.get("/keys", asyncHandler(async (req, res) => res.json({ data: await apiKeys.listKeys(req.auth.companyId) })));
router.post("/keys", asyncHandler(async (req, res) => {
  const key = await apiKeys.createKey(req.auth, req.body || {});
  await audit(req, "developer.key_created", key.key_id, { name: key.name, scopes: key.scopes, expires_at: key.expires_at });
  res.status(201).json({ data: key });
}));
router.post("/keys/:keyId/roll", asyncHandler(async (req, res) => {
  const key = await apiKeys.rollKey(req.auth, req.params.keyId);
  await audit(req, "developer.key_rolled", key.key_id, { name: key.name, replaces: key.replaces });
  res.status(201).json({ data: key });
}));
router.delete("/keys/:keyId", asyncHandler(async (req, res) => {
  const key = await apiKeys.revokeKey(req.auth, req.params.keyId);
  await audit(req, "developer.key_revoked", key.key_id, { name: key.name });
  res.json({ data: { key_id: key.key_id, revoked: true } });
}));

router.get("/links", asyncHandler(async (req, res) => res.json({ data: await forms.listForms(req.auth.companyId) })));
router.post("/links", asyncHandler(async (req, res) => {
  const form = await forms.createForm(req.auth, req.body || {});
  await audit(req, "developer.link_created", form.form_id, { name: form.name, source: form.lead_source });
  res.status(201).json({ data: form });
}));
router.patch("/links/:formId", asyncHandler(async (req, res) => {
  const form = await forms.updateForm(req.auth, req.params.formId, req.body || {});
  await audit(req, "developer.link_updated", form.form_id, { name: form.name, active: form.is_active });
  res.json({ data: form });
}));
router.post("/links/:formId/new-link", asyncHandler(async (req, res) => {
  const form = await forms.rotateToken(req.auth, req.params.formId);
  await audit(req, "developer.link_rotated", form.form_id, { name: form.name });
  res.json({ data: form });
}));
router.delete("/links/:formId", asyncHandler(async (req, res) => {
  const form = await forms.deleteForm(req.auth, req.params.formId);
  await audit(req, "developer.link_deleted", form.form_id, { name: form.name });
  res.json({ data: { form_id: form.form_id, deleted: true } });
}));

router.get("/webhooks", asyncHandler(async (req, res) => res.json({ data: await webhooks.listWebhooks(req.auth.companyId) })));
router.post("/webhooks", asyncHandler(async (req, res) => {
  const hook = await webhooks.createWebhook(req.auth, req.body || {});
  await audit(req, "developer.webhook_created", hook.webhook_id, { name: hook.name, url: hook.url, events: hook.events });
  res.status(201).json({ data: hook });
}));
router.patch("/webhooks/:webhookId", asyncHandler(async (req, res) => {
  const hook = await webhooks.updateWebhook(req.auth, req.params.webhookId, req.body || {});
  await audit(req, "developer.webhook_updated", hook.webhook_id, { url: hook.url, events: hook.events, active: hook.is_active });
  res.json({ data: hook });
}));
router.post("/webhooks/:webhookId/secret", asyncHandler(async (req, res) => {
  const hook = await webhooks.rotateSecret(req.auth, req.params.webhookId);
  await audit(req, "developer.webhook_secret_rotated", hook.webhook_id, { name: hook.name });
  res.json({ data: hook });
}));
router.post("/webhooks/:webhookId/ping", asyncHandler(async (req, res) => {
  await webhooks.getWebhook(req.auth.companyId, req.params.webhookId);
  await leadEvents.ping(req.auth.companyId, req.params.webhookId, req.auth);
  res.json({ data: { queued: true } });
}));
router.delete("/webhooks/:webhookId", asyncHandler(async (req, res) => {
  const hook = await webhooks.deleteWebhook(req.auth, req.params.webhookId);
  await audit(req, "developer.webhook_deleted", hook.webhook_id, { name: hook.name });
  res.json({ data: { webhook_id: hook.webhook_id, deleted: true } });
}));
router.get("/deliveries", asyncHandler(async (req, res) => res.json({ data: await webhooks.listDeliveries(req.auth.companyId, req.query) })));
router.post("/deliveries/:id/resend", asyncHandler(async (req, res) => res.json({ data: await webhooks.redeliver(req.auth, req.params.id) })));

router.get("/logs", asyncHandler(async (req, res) => res.json({ data: await requestLog.listRecent(req.auth.companyId, req.query) })));

module.exports = router;
