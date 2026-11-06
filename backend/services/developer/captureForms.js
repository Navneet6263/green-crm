const crypto = require("node:crypto");
const db = require("../../db/connection");
const AppError = require("../../utils/appError");

// A lead capture link is a secret URL (/api/v1/capture/<token>) that turns any form post into a lead.
// The link can only create leads in its own company, so its token is kept readable for the admin.
const SOURCE_PATTERN = /^[a-z0-9-]{2,40}$/;
const MAX_FORMS = 50;
const MAX_OWNERS = 25;

const newToken = () => `lc_${crypto.randomBytes(18).toString("base64url")}`;
const newId = () => `lcf_${crypto.randomBytes(8).toString("hex")}`;

function parseOwners(raw) {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw || "[]") || []; } catch (_error) { return []; }
}

function publicForm(row) {
  return {
    form_id: row.form_id,
    name: row.name,
    token: row.token,
    lead_source: row.lead_source,
    product_id: row.product_id,
    product_name: row.product_name || null,
    owner_ids: parseOwners(row.owner_ids),
    redirect_url: row.redirect_url,
    is_active: Boolean(row.is_active),
    lead_count: row.lead_count || 0,
    repeat_count: row.repeat_count || 0,
    last_lead_at: row.last_lead_at,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function listForms(companyId) {
  const [rows] = await db.query(
    `SELECT f.*, p.name AS product_name FROM lead_capture_forms f
     LEFT JOIN products p ON p.product_id = f.product_id
     WHERE f.company_id = ? ORDER BY f.is_active DESC, f.created_at DESC`,
    [companyId]
  );
  return rows.map(publicForm);
}

async function getForm(companyId, formId) {
  const [rows] = await db.query(
    `SELECT f.*, p.name AS product_name FROM lead_capture_forms f
     LEFT JOIN products p ON p.product_id = f.product_id
     WHERE f.form_id = ? AND f.company_id = ?`,
    [formId, companyId]
  );
  if (!rows.length) throw new AppError("Lead capture link not found.", 404);
  return rows[0];
}

/** Checks and cleans what the admin typed; `current` is the saved link when editing. */
async function cleanInput(companyId, payload, current = null) {
  const pick = (key, fallback) => (Object.prototype.hasOwnProperty.call(payload, key) ? payload[key] : fallback);
  const name = String(pick("name", current?.name) || "").trim().slice(0, 120);
  if (!name) throw new AppError("Give the link a name, like \"Website contact form\".", 400);

  const source = String(pick("lead_source", current?.lead_source) || "website").trim().toLowerCase();
  if (!SOURCE_PATTERN.test(source)) throw new AppError("Lead source can use small letters, numbers and dashes only.", 400);

  const productId = String(pick("product_id", current?.product_id) || "").trim();
  if (!productId) throw new AppError("Choose the product these leads are for.", 400);
  const [products] = await db.query(
    "SELECT TOP 1 product_id FROM products WHERE product_id = ? AND company_id = ? AND is_active = 1",
    [productId, companyId]
  );
  if (!products.length) throw new AppError("That product is not active in your company.", 400);

  const ownerIds = [...new Set(parseOwners(pick("owner_ids", current?.owner_ids)).map(String).filter(Boolean))];
  if (ownerIds.length > MAX_OWNERS) throw new AppError(`Pick up to ${MAX_OWNERS} people.`, 400);
  if (ownerIds.length) {
    const [users] = await db.query(
      `SELECT user_id FROM users WHERE company_id = ? AND is_active = 1 AND user_id IN (${ownerIds.map(() => "?").join(", ")})`,
      [companyId, ...ownerIds]
    );
    if (users.length !== ownerIds.length) throw new AppError("Some of the people picked are not active in your company.", 400);
  }

  const redirect = String(pick("redirect_url", current?.redirect_url) || "").trim();
  if (redirect && !/^https?:\/\/[^\s]+$/i.test(redirect)) throw new AppError("The thank-you page must be a full link starting with https://", 400);

  return {
    name,
    lead_source: source,
    product_id: productId,
    owner_ids: JSON.stringify(ownerIds),
    redirect_url: redirect ? redirect.slice(0, 500) : null,
    is_active: pick("is_active", current ? Boolean(current.is_active) : true) ? 1 : 0,
  };
}

async function createForm(auth, payload = {}) {
  const [[count]] = await db.query("SELECT COUNT(*) AS total FROM lead_capture_forms WHERE company_id = ?", [auth.companyId]);
  if (Number(count?.total || 0) >= MAX_FORMS) throw new AppError(`You can have ${MAX_FORMS} lead capture links.`, 400);
  const input = await cleanInput(auth.companyId, payload);
  const formId = newId();
  await db.query(
    `INSERT INTO lead_capture_forms (form_id, company_id, name, token, lead_source, product_id, owner_ids, redirect_url, is_active, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [formId, auth.companyId, input.name, newToken(), input.lead_source, input.product_id, input.owner_ids, input.redirect_url, input.is_active, auth.userId]
  );
  return publicForm(await getForm(auth.companyId, formId));
}

async function updateForm(auth, formId, payload = {}) {
  const current = await getForm(auth.companyId, formId);
  const input = await cleanInput(auth.companyId, payload, current);
  await db.query(
    `UPDATE lead_capture_forms SET name = ?, lead_source = ?, product_id = ?, owner_ids = ?, redirect_url = ?, is_active = ?,
       next_owner = CASE WHEN owner_ids = ? THEN next_owner ELSE 0 END, updated_at = SYSUTCDATETIME()
     WHERE form_id = ? AND company_id = ?`,
    [input.name, input.lead_source, input.product_id, input.owner_ids, input.redirect_url, input.is_active, input.owner_ids, formId, auth.companyId]
  );
  return publicForm(await getForm(auth.companyId, formId));
}

/** A new secret link; the old one stops working at once. */
async function rotateToken(auth, formId) {
  await getForm(auth.companyId, formId);
  await db.query(
    "UPDATE lead_capture_forms SET token = ?, updated_at = SYSUTCDATETIME() WHERE form_id = ? AND company_id = ?",
    [newToken(), formId, auth.companyId]
  );
  return publicForm(await getForm(auth.companyId, formId));
}

async function deleteForm(auth, formId) {
  const form = await getForm(auth.companyId, formId);
  await db.query("DELETE FROM lead_capture_forms WHERE form_id = ? AND company_id = ?", [formId, auth.companyId]);
  return { form_id: formId, name: form.name };
}

async function findByToken(token) {
  if (!/^lc_[A-Za-z0-9_-]{24}$/.test(String(token || ""))) return null;
  const [rows] = await db.query("SELECT TOP 1 * FROM lead_capture_forms WHERE token = ?", [token]);
  return rows[0] || null;
}

/** Next owner in turn among the link's active people; the link's creator when none are left. */
async function nextOwner(form) {
  const ids = parseOwners(form.owner_ids);
  if (!ids.length) return form.created_by;
  const [users] = await db.query(
    `SELECT user_id FROM users WHERE company_id = ? AND is_active = 1 AND user_id IN (${ids.map(() => "?").join(", ")})`,
    [form.company_id, ...ids]
  );
  const active = ids.filter((id) => users.some((user) => user.user_id === id));
  if (!active.length) return form.created_by;
  const [rows] = await db.query(
    "UPDATE lead_capture_forms SET next_owner = next_owner + 1 OUTPUT DELETED.next_owner AS turn WHERE form_id = ?",
    [form.form_id]
  );
  return active[Number(rows[0]?.turn || 0) % active.length];
}

async function countLead(formId, repeat) {
  await db.query(
    `UPDATE lead_capture_forms SET ${repeat ? "repeat_count = repeat_count + 1" : "lead_count = lead_count + 1"}, last_lead_at = SYSUTCDATETIME() WHERE form_id = ?`,
    [formId]
  );
}

module.exports = { countLead, createForm, deleteForm, findByToken, getForm, listForms, nextOwner, parseOwners, publicForm, rotateToken, updateForm };
