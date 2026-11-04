const AppError = require("../../utils/appError");
const { ROLES } = require("../../constants/roles");
const { query } = require("../../db/connection");
const customerActivityRepository = require("../../repositories/customerActivityRepository");
const userRepository = require("../../repositories/userRepository");
const customerService = require("../customerService");

// The usual journey from "deal won" to "using it well". Every customer starts with these; more can be added.
const DEFAULT_STEPS = [
  ["kickoff", "Welcome call done", 0],
  ["agreement", "Agreement / PO received", 1],
  ["advance", "Advance payment received", 2],
  ["account", "Account and logins created", 3],
  ["data", "Data imported", 5],
  ["training", "Team training done", 7],
  ["golive", "Go-live", 10],
  ["review", "30-day review call", 40],
];
const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = 86400000;

function canEdit(auth) {
  if ([ROLES.VIEWER].includes(auth.role)) throw new AppError("View-only users cannot change onboarding.", 403);
}

async function listRows(customer) {
  const [rows] = await query(
    `SELECT s.id, s.step_key, s.title, s.sort_order, s.is_done, s.done_at, s.done_by, d.name AS done_by_name, s.due_date, s.owner_id, o.name AS owner_name, s.note, s.is_custom
     FROM customer_onboarding_steps s
     LEFT JOIN users d ON d.user_id = s.done_by
     LEFT JOIN users o ON o.user_id = s.owner_id
     WHERE s.company_id = ? AND s.customer_id = ?
     ORDER BY s.sort_order, s.created_at`,
    [customer.company_id, customer.customer_id]
  );
  return rows.map((r) => ({ ...r, is_done: Boolean(r.is_done), is_custom: Boolean(r.is_custom) }));
}

/** Creates the default checklist the first time; due dates count from the onboarding start (or today). */
async function ensureSteps(customer) {
  const existing = await listRows(customer);
  if (existing.length) return existing;
  const start = customer.onboarding_date ? new Date(customer.onboarding_date) : new Date();
  const done = ["done", "completed"].includes(String(customer.onboarding_status || ""));
  for (const [index, [key, title, days]] of DEFAULT_STEPS.entries()) {
    await query(
      `INSERT INTO customer_onboarding_steps (company_id, customer_id, step_key, title, sort_order, is_done, done_at, due_date, owner_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [customer.company_id, customer.customer_id, key, title, index * 10, done ? 1 : 0, done ? new Date() : null, new Date(start.getTime() + days * DAY), customer.assigned_to || null]
    );
  }
  return listRows(customer);
}

function summarise(steps) {
  const done = steps.filter((s) => s.is_done).length;
  const now = Date.now();
  return {
    total: steps.length, done, percent: steps.length ? Math.round((done / steps.length) * 100) : 0,
    overdue: steps.filter((s) => !s.is_done && s.due_date && new Date(s.due_date).getTime() < now).length,
    next: steps.find((s) => !s.is_done) || null,
  };
}

/** Keeps the customer's onboarding status in step with the checklist. */
async function syncStatus(customer, steps) {
  const { total, done } = summarise(steps);
  const status = !done ? "pending" : done === total ? "done" : "in-progress";
  await query(
    `UPDATE customers SET onboarding_status = ?,
       onboarding_date = COALESCE(onboarding_date, CASE WHEN ? > 0 THEN SYSUTCDATETIME() ELSE NULL END),
       onboarding_completed_at = CASE WHEN ? = 'done' THEN COALESCE(onboarding_completed_at, SYSUTCDATETIME()) ELSE NULL END
     WHERE customer_id = ? AND company_id = ?`,
    [status, done, status, customer.customer_id, customer.company_id]
  );
  return status;
}

async function getOnboarding(auth, customerId) {
  const customer = await customerService.getCustomer(auth, customerId);
  const steps = await ensureSteps(customer);
  return { steps, summary: summarise(steps), status: await syncStatus(customer, steps), started_at: customer.onboarding_date || null };
}

async function stepOf(customer, stepId) {
  if (!GUID_RE.test(String(stepId || ""))) throw new AppError("Step not found.", 404);
  const step = (await listRows(customer)).find((s) => String(s.id).toLowerCase() === String(stepId).toLowerCase());
  if (!step) throw new AppError("Step not found.", 404);
  return step;
}

async function updateStep(auth, customerId, stepId, body = {}) {
  canEdit(auth);
  const customer = await customerService.getCustomer(auth, customerId);
  const step = await stepOf(customer, stepId);
  const sets = [];
  const params = [];
  if (body.is_done !== undefined) {
    const done = Boolean(body.is_done);
    sets.push("is_done = ?", "done_at = ?", "done_by = ?");
    params.push(done ? 1 : 0, done ? new Date() : null, done ? auth.userId : null);
  }
  if (body.title !== undefined) {
    const title = String(body.title).trim().slice(0, 160);
    if (!title) throw new AppError("Give the step a name.", 400);
    sets.push("title = ?"); params.push(title);
  }
  if (body.due_date !== undefined) {
    const due = body.due_date ? new Date(body.due_date) : null;
    if (due && Number.isNaN(due.getTime())) throw new AppError("Due date is not valid.", 400);
    sets.push("due_date = ?"); params.push(due);
  }
  if (body.owner_id !== undefined) {
    if (body.owner_id && !(await userRepository.getUserInCompany(body.owner_id, customer.company_id))) throw new AppError("Choose someone from your company.", 400);
    sets.push("owner_id = ?"); params.push(body.owner_id || null);
  }
  if (body.note !== undefined) { sets.push("note = ?"); params.push(String(body.note).trim().slice(0, 500) || null); }
  if (!sets.length) throw new AppError("Nothing to change.", 400);
  await query(`UPDATE customer_onboarding_steps SET ${sets.join(", ")} WHERE id = ?`, [...params, step.id]);
  if (body.is_done !== undefined && Boolean(body.is_done) !== step.is_done) {
    await customerActivityRepository.createActivity({
      company_id: customer.company_id, customer_id: customer.customer_id, type: "onboarding",
      description: `${body.is_done ? "Done" : "Reopened"}: ${step.title}`, created_by: auth.userId,
    }).catch(() => {});
  }
  return getOnboarding(auth, customerId);
}

async function addStep(auth, customerId, body = {}) {
  canEdit(auth);
  const customer = await customerService.getCustomer(auth, customerId);
  const title = String(body.title || "").trim().slice(0, 160);
  if (!title) throw new AppError("Give the step a name.", 400);
  const steps = await ensureSteps(customer);
  if (steps.length >= 40) throw new AppError("A checklist can have up to 40 steps.", 400);
  const due = body.due_date ? new Date(body.due_date) : null;
  if (due && Number.isNaN(due.getTime())) throw new AppError("Due date is not valid.", 400);
  await query(
    `INSERT INTO customer_onboarding_steps (company_id, customer_id, step_key, title, sort_order, due_date, owner_id, is_custom)
     VALUES (?, ?, 'custom', ?, ?, ?, ?, 1)`,
    [customer.company_id, customer.customer_id, title, Math.max(0, ...steps.map((s) => s.sort_order)) + 10, due, body.owner_id || customer.assigned_to || null]
  );
  return getOnboarding(auth, customerId);
}

async function removeStep(auth, customerId, stepId) {
  canEdit(auth);
  const customer = await customerService.getCustomer(auth, customerId);
  const step = await stepOf(customer, stepId);
  if (!step.is_custom && ![ROLES.ADMIN, ROLES.MANAGER].includes(auth.role)) throw new AppError("Only admins and managers can remove a standard step.", 403);
  await query("DELETE FROM customer_onboarding_steps WHERE id = ?", [step.id]);
  return getOnboarding(auth, customerId);
}

module.exports = { DEFAULT_STEPS, addStep, getOnboarding, removeStep, summarise, updateStep };
