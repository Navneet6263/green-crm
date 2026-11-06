const db = require("../../db/connection");
const AppError = require("../../utils/appError");
const { LEAD_PRIORITIES, LEAD_STATUSES } = require("../../constants/lead");
const { publicLead } = require("./leadShape");

// Test mode (dry run): checks a create or update the way a real one would, lists every problem
// at once, and saves nothing.

const isDate = (value) => !Number.isNaN(new Date(value).getTime());

async function commonProblems(auth, payload) {
  const problems = [];
  if (payload.status !== undefined && !LEAD_STATUSES.includes(String(payload.status).toLowerCase())) {
    problems.push({ field: "status", message: `Use one of: ${LEAD_STATUSES.join(", ")}.` });
  }
  if (payload.priority !== undefined && !LEAD_PRIORITIES.includes(String(payload.priority).toLowerCase())) {
    problems.push({ field: "priority", message: `Use one of: ${LEAD_PRIORITIES.join(", ")}.` });
  }
  if (payload.estimated_value !== undefined && payload.estimated_value !== null && !Number.isFinite(Number(payload.estimated_value))) {
    problems.push({ field: "estimated_value", message: "Must be a number." });
  }
  if (payload.follow_up_date && !isDate(payload.follow_up_date)) {
    problems.push({ field: "follow_up_date", message: "Use YYYY-MM-DD or a full ISO date." });
  }
  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(payload.email))) {
    problems.push({ field: "email", message: "Not a valid email." });
  }
  if (payload.product_id) {
    const [rows] = await db.query("SELECT TOP 1 product_id FROM products WHERE product_id = ? AND company_id = ? AND is_active = 1", [payload.product_id, auth.companyId]);
    if (!rows.length) problems.push({ field: "product_id", message: "No active product with this id. GET /v1/products lists them." });
  }
  if (payload.assigned_to) {
    const [rows] = await db.query("SELECT TOP 1 user_id FROM users WHERE user_id = ? AND company_id = ? AND is_active = 1", [payload.assigned_to, auth.companyId]);
    if (!rows.length) problems.push({ field: "owner_id", message: "No active person with this id. GET /v1/users lists them." });
  }
  return problems;
}

async function duplicateWarning(auth, payload, excludeId = null) {
  if (!payload.phone && !payload.email) return null;
  const parts = [];
  const params = [auth.companyId];
  if (payload.phone) { parts.push("RIGHT(phone, 10) = RIGHT(?, 10)"); params.push(String(payload.phone)); }
  if (payload.email) { parts.push("LOWER(email) = LOWER(?)"); params.push(String(payload.email)); }
  if (excludeId) params.push(excludeId);
  const [rows] = await db.query(
    `SELECT TOP 1 lead_id, contact_person FROM leads WHERE company_id = ? AND is_active = 1 AND (${parts.join(" OR ")})${excludeId ? " AND lead_id <> ?" : ""}`,
    params
  );
  return rows[0] ? { field: payload.phone ? "phone" : "email", message: `Already in the CRM as ${rows[0].lead_id} (${rows[0].contact_person}). A real create may be refused.` } : null;
}

function fail(problems) {
  throw new AppError(`${problems.length} problem${problems.length === 1 ? "" : "s"} found. Nothing was saved.`, 422, { problems }, "VALIDATION_FAILED");
}

async function previewCreate(auth, payload) {
  const problems = await commonProblems(auth, payload);
  if (!String(payload.contact_person || "").trim()) problems.push({ field: "contact_person", message: "Required (or send name)." });
  if (!payload.phone && !payload.email) problems.push({ field: "phone", message: "Send a phone number or an email." });
  if (!payload.product_id) problems.push({ field: "product_id", message: "Required when your company has more than one product." });
  if (problems.length) fail(problems);
  const warning = await duplicateWarning(auth, payload);
  return {
    dry_run: true,
    valid: true,
    warnings: warning ? [warning] : [],
    lead: publicLead({ ...payload, lead_id: null, status: payload.status || "new", priority: payload.priority || "medium", assigned_to: payload.assigned_to || auth.userId }),
  };
}

async function previewUpdate(auth, current, payload) {
  const problems = await commonProblems(auth, payload);
  const merged = { ...current, ...payload };
  if (!String(merged.contact_person || "").trim()) problems.push({ field: "contact_person", message: "Cannot be empty." });
  if (!merged.phone && !merged.email) problems.push({ field: "phone", message: "A lead needs a phone number or an email." });
  if (problems.length) fail(problems);
  const before = publicLead(current);
  const after = publicLead(merged);
  const changes = Object.keys(after).filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key])).map((key) => ({ field: key, from: before[key], to: after[key] }));
  const warning = payload.phone || payload.email ? await duplicateWarning(auth, payload, current.lead_id) : null;
  return { dry_run: true, valid: true, warnings: warning ? [warning] : [], changes, lead: after };
}

module.exports = { previewCreate, previewUpdate };
