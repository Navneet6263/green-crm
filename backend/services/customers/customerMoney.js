const AppError = require("../../utils/appError");
const { ROLES } = require("../../constants/roles");
const { query } = require("../../db/connection");
const { createPrefixedId } = require("../../utils/ids");
const auditRepository = require("../../repositories/auditRepository");
const customerActivityRepository = require("../../repositories/customerActivityRepository");
const customerService = require("../customerService");
const { customerHealth } = require("./customerHealth");

const MODES = ["upi", "bank-transfer", "cash", "cheque", "card", "other"];
const CYCLES = ["one-time", "monthly", "quarterly", "half-yearly", "yearly"];
const MANAGE_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.PLATFORM_MANAGER, ROLES.FINANCE_TEAM];
const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const inr = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

function canRecord(auth) {
  if ([ROLES.VIEWER, ROLES.LEGAL_TEAM].includes(auth.role)) throw new AppError("Your role cannot record payments.", 403);
}

function parseDate(value, label, { allowFuture = true } = {}) {
  if (value === undefined || value === null || value === "") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new AppError(`${label} is not a valid date.`, 400);
  if (!allowFuture && d.getTime() > Date.now() + 86400000) throw new AppError(`${label} cannot be in the future.`, 400);
  return d;
}

async function log(auth, customer, type, description, details) {
  await customerActivityRepository.createActivity({ company_id: customer.company_id, customer_id: customer.customer_id, type, description, created_by: auth.userId }).catch(() => {});
  await auditRepository.createLog({
    audit_id: await createPrefixedId("aud"), company_id: customer.company_id, action: `customer.${type}`, performed_by: auth.userId,
    user_email: auth.email, user_role: auth.role, target_user: customer.customer_id, details,
  }).catch(() => {});
}

/** Contract value, paid, pending, next due date and every payment; plus the source lead's advance if not yet entered. */
async function getMoney(auth, customerId) {
  const customer = await customerService.getCustomer(auth, customerId);
  const [payments] = await query(
    `SELECT p.id, p.amount, p.paid_on, p.mode, p.reference, p.note, p.created_at, p.recorded_by, u.name AS recorded_by_name
     FROM customer_payments p LEFT JOIN users u ON u.user_id = p.recorded_by
     WHERE p.company_id = ? AND p.customer_id = ? AND p.deleted_at IS NULL
     ORDER BY p.paid_on DESC, p.created_at DESC`,
    [customer.company_id, customer.customer_id]
  );
  let leadAdvance = 0;
  if (customer.converted_from_lead_id && !payments.length) {
    const [rows] = await query("SELECT advance_received FROM leads WHERE lead_id = ? AND company_id = ?", [customer.converted_from_lead_id, customer.company_id]).catch(() => [[]]);
    leadAdvance = Number(rows[0]?.advance_received || 0);
  }
  const paid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const contract = Number(customer.total_value || 0);
  return {
    contract_value: contract, paid, pending: Math.max(0, contract - paid), extra_paid: Math.max(0, paid - contract),
    next_payment_date: customer.next_payment_date || null, billing_cycle: customer.billing_cycle || null,
    overdue: contract - paid > 0 && customer.next_payment_date && new Date(customer.next_payment_date) < new Date(),
    lead_advance: leadAdvance, payments: payments.map((p) => ({ ...p, amount: Number(p.amount) })),
    health: customerHealth({ ...customer, paid_amount: paid }),
    can_delete: MANAGE_ROLES.includes(auth.role),
  };
}

async function addPayment(auth, customerId, body = {}) {
  canRecord(auth);
  const customer = await customerService.getCustomer(auth, customerId);
  const amount = Math.round(Number(body.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e11) throw new AppError("Enter the amount received.", 400);
  const mode = MODES.includes(body.mode) ? body.mode : null;
  if (!mode) throw new AppError("Choose how it was paid.", 400);
  const paidOn = parseDate(body.paid_on, "Payment date", { allowFuture: false }) || new Date();
  const nextDate = parseDate(body.next_payment_date, "Next payment date");
  const [rows] = await query(
    `INSERT INTO customer_payments (company_id, customer_id, amount, paid_on, mode, reference, note, recorded_by)
     OUTPUT INSERTED.id VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [customer.company_id, customer.customer_id, amount, paidOn, mode, String(body.reference || "").trim().slice(0, 120) || null, String(body.note || "").trim().slice(0, 500) || null, auth.userId]
  );
  if (body.next_payment_date !== undefined) {
    await query("UPDATE customers SET next_payment_date = ?, updated_at = SYSUTCDATETIME() WHERE customer_id = ? AND company_id = ?", [nextDate, customer.customer_id, customer.company_id]);
  }
  // Getting paid also ticks the "advance received" onboarding step.
  await query(
    "UPDATE customer_onboarding_steps SET is_done = 1, done_at = SYSUTCDATETIME(), done_by = ? WHERE company_id = ? AND customer_id = ? AND step_key = 'advance' AND is_done = 0",
    [auth.userId, customer.company_id, customer.customer_id]
  ).catch(() => {});
  await log(auth, customer, "payment_received", `${inr(amount)} received by ${mode.replace("-", " ")}${body.reference ? ` (ref ${String(body.reference).slice(0, 40)})` : ""}`, { amount, mode });
  return { id: rows[0]?.id, ...(await getMoney(auth, customerId)) };
}

async function deletePayment(auth, customerId, paymentId) {
  if (!MANAGE_ROLES.includes(auth.role)) throw new AppError("Only admins, managers and finance can remove a payment.", 403);
  if (!GUID_RE.test(String(paymentId || ""))) throw new AppError("Payment not found.", 404);
  const customer = await customerService.getCustomer(auth, customerId);
  const [rows] = await query("SELECT id, amount FROM customer_payments WHERE id = ? AND company_id = ? AND customer_id = ? AND deleted_at IS NULL", [paymentId, customer.company_id, customer.customer_id]);
  if (!rows.length) throw new AppError("Payment not found.", 404);
  await query("UPDATE customer_payments SET deleted_at = SYSUTCDATETIME(), deleted_by = ? WHERE id = ?", [auth.userId, paymentId]);
  await log(auth, customer, "payment_removed", `Payment of ${inr(rows[0].amount)} removed`, { payment_id: paymentId });
  return getMoney(auth, customerId);
}

/** Contract value, billing cycle and next payment date. */
async function updateBilling(auth, customerId, body = {}) {
  canRecord(auth);
  const customer = await customerService.getCustomer(auth, customerId);
  const sets = [];
  const params = [];
  if (body.total_value !== undefined) {
    const value = Number(body.total_value);
    if (!Number.isFinite(value) || value < 0 || value > 1e11) throw new AppError("Enter a valid contract value.", 400);
    sets.push("total_value = ?"); params.push(value);
  }
  if (body.billing_cycle !== undefined) {
    if (body.billing_cycle && !CYCLES.includes(body.billing_cycle)) throw new AppError("Choose a billing cycle.", 400);
    sets.push("billing_cycle = ?"); params.push(body.billing_cycle || null);
  }
  if (body.next_payment_date !== undefined) { sets.push("next_payment_date = ?"); params.push(parseDate(body.next_payment_date, "Next payment date")); }
  if (!sets.length) throw new AppError("Nothing to change.", 400);
  await query(`UPDATE customers SET ${sets.join(", ")}, updated_at = SYSUTCDATETIME() WHERE customer_id = ? AND company_id = ?`, [...params, customer.customer_id, customer.company_id]);
  await log(auth, customer, "billing_updated", "Billing details updated", body);
  return getMoney(auth, customerId);
}

module.exports = { CYCLES, MODES, addPayment, deletePayment, getMoney, updateBilling };
