const db = require("../../db/connection");
const AppError = require("../../utils/appError");
const { encodeCursor } = require("../../utils/pagination");
const leadService = require("../leadService");
const { publicLead } = require("./leadShape");
const checks = require("./leadChecks");

// Public field name → CRM field name, for create and update.
const WRITABLE = {
  contact_person: "contact_person", name: "contact_person", company_name: "company_name", email: "email", phone: "phone",
  city: "address_city", state: "address_state", country: "address_country", industry: "industry", source: "lead_source",
  status: "status", priority: "priority", product_id: "product_id", owner_id: "assigned_to",
  estimated_value: "estimated_value", follow_up_date: "follow_up_date", requirements: "requirements", notes: "requirements",
};
const FIELDS = Object.keys(publicLead({ lead_id: "x" }));
const SORTS = { newest: ["created_at", "desc"], oldest: ["created_at", "asc"], updated: ["updated_at", "desc"] };
const MAX_PAGE = 100;

function toCrmPayload(body = {}, ignore = []) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new AppError("Send the lead as a JSON object.", 400);
  const keys = Object.keys(body).filter((key) => !ignore.includes(key));
  const unknown = keys.filter((key) => !WRITABLE[key]);
  if (unknown.length) {
    throw new AppError(`Unknown field: ${unknown.join(", ")}. Allowed: ${Object.keys(WRITABLE).join(", ")}.`, 400, null, "UNKNOWN_FIELD");
  }
  return keys.reduce((payload, key) => ({ ...payload, [WRITABLE[key]]: body[key] }), {});
}

/** `fields=id,phone,status` → only those fields (id always comes back). */
function parseFields(value) {
  if (!value) return null;
  const list = [...new Set(String(value).split(",").map((f) => f.trim()).filter(Boolean))];
  const unknown = list.filter((f) => !FIELDS.includes(f));
  if (unknown.length) throw new AppError(`Unknown field in fields: ${unknown.join(", ")}. Allowed: ${FIELDS.join(", ")}.`, 400, null, "UNKNOWN_FIELD");
  return ["id", ...list.filter((f) => f !== "id")];
}
const pick = (lead, fields) => (fields ? Object.fromEntries(fields.map((f) => [f, lead[f]])) : lead);

function parseDate(value, name) {
  if (!value) return undefined;
  if (Number.isNaN(new Date(value).getTime())) throw new AppError(`${name} must be a date, like 2026-11-01 or 2026-11-01T10:30:00Z.`, 400, null, "INVALID_DATE");
  return String(value);
}

async function defaultProductId(companyId) {
  const [rows] = await db.query("SELECT TOP 2 product_id FROM products WHERE company_id = ? AND is_active = 1", [companyId]);
  return rows.length === 1 ? rows[0].product_id : null;
}

/**
 * Lists leads, at most 100 per call. Page through with `page`, or with `cursor` (faster on big lists,
 * sort=newest only). `updated_since` returns what changed since your last sync.
 */
async function listLeads(auth, query = {}) {
  const pageSize = Math.min(Math.max(Number(query.page_size || query.limit) || 25, 1), MAX_PAGE);
  const sort = String(query.sort || "newest");
  if (!SORTS[sort]) throw new AppError("sort must be newest, oldest or updated.", 400, null, "INVALID_SORT");
  if (query.cursor && sort !== "newest") throw new AppError("cursor works with sort=newest only.", 400, null, "INVALID_CURSOR");
  if (query.cursor && query.page) throw new AppError("Send page or cursor, not both.", 400, null, "INVALID_CURSOR");
  const updatedSince = parseDate(query.updated_since, "updated_since");
  if (updatedSince && (query.created_from || query.created_to)) {
    throw new AppError("Use updated_since, or created_from / created_to, not both.", 400, null, "INVALID_DATE");
  }
  const fields = parseFields(query.fields);
  const page = Math.max(Number(query.page) || 1, 1);

  const result = await leadService.listLeads(auth, {
    page: query.cursor ? undefined : page,
    page_size: pageSize,
    cursor: query.cursor || undefined,
    status: query.status,
    source: query.source,
    priority: query.priority,
    product_id: query.product_id,
    assigned_to: query.owner_id,
    search: query.search ? String(query.search).slice(0, 100) : undefined,
    date_filter_type: updatedSince ? "updated_at" : undefined,
    created_from: updatedSince || parseDate(query.created_from, "created_from"),
    created_to: parseDate(query.created_to, "created_to"),
    sort: SORTS[sort][0],
    sort_dir: SORTS[sort][1],
    include_workflow_summary: "0",
  });
  const meta = result.meta || {};
  const rows = result.items || [];
  const cursorMode = meta.mode === "cursor";
  const hasMore = cursorMode ? Boolean(meta.has_more) : page < (meta.total_pages || 1);
  const last = rows[rows.length - 1];
  const nextCursor = cursorMode ? meta.next_cursor || null
    : sort === "newest" && hasMore && last ? encodeCursor({ created_at: last.created_at, id: last.id }) : null;
  return {
    items: rows.map((row) => pick(publicLead(row), fields)),
    meta: {
      page_size: pageSize, sort, total: meta.total ?? null, has_more: hasMore,
      next_cursor: nextCursor, page: cursorMode ? null : page, next_page: !cursorMode && hasMore ? page + 1 : null,
    },
  };
}

async function getLead(auth, leadId, query = {}) {
  return pick(publicLead(await leadService.getLead(auth, leadId, { view: "core" })), parseFields(query.fields));
}

async function createLead(auth, body, { dryRun = false } = {}) {
  const payload = toCrmPayload(body);
  if (typeof payload.email === "string") payload.email = payload.email.trim().toLowerCase();
  if (!payload.company_name && payload.contact_person) payload.company_name = payload.contact_person;
  if (!payload.product_id) payload.product_id = await defaultProductId(auth.companyId);
  if (!payload.lead_source) payload.lead_source = "api";
  if (dryRun) return checks.previewCreate(auth, payload);
  if (!payload.product_id) throw new AppError("product_id is required. GET /v1/products lists your products.", 400, null, "PRODUCT_REQUIRED");
  const lead = await leadService.createLead(auth, payload);
  return getLead(auth, lead.lead_id);
}

/** Every change in the CRM carries a note; the app can send its own as change_note. */
async function updateLead(auth, leadId, body, { dryRun = false, keyName = "API" } = {}) {
  const payload = toCrmPayload(body, ["change_note"]);
  if (!Object.keys(payload).length) throw new AppError("Send at least one field to change.", 400);
  if (dryRun) return checks.previewUpdate(auth, await leadService.getLead(auth, leadId, { view: "core" }), payload);
  const note = String(body.change_note || "").trim().slice(0, 1000) || `Updated through the API (key: ${keyName}).`;
  await leadService.updateLead(auth, leadId, { ...payload, change_note: note });
  return getLead(auth, leadId);
}

async function addNote(auth, leadId, body = {}, { dryRun = false } = {}) {
  const content = String(body.content || body.note || "").trim();
  if (!content) throw new AppError("Send the note as { \"content\": \"...\" }.", 400);
  if (dryRun) {
    await leadService.getLead(auth, leadId, { view: "core" });
    return { dry_run: true, valid: true, lead_id: leadId };
  }
  await leadService.addLeadNote(auth, leadId, { content: content.slice(0, 4000) });
  return { lead_id: leadId, created: true };
}

async function listProducts(auth) {
  const [rows] = await db.query("SELECT product_id AS id, name FROM products WHERE company_id = ? AND is_active = 1 ORDER BY name", [auth.companyId]);
  return rows;
}

async function listUsers(auth) {
  const [rows] = await db.query("SELECT user_id AS id, name, email, role FROM users WHERE company_id = ? AND is_active = 1 ORDER BY name", [auth.companyId]);
  return rows;
}

module.exports = { FIELDS, MAX_PAGE, addNote, createLead, getLead, listLeads, listProducts, listUsers, parseFields, publicLead, toCrmPayload, updateLead };
