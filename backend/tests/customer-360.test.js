const { test } = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');

const db = require('../db/connection');
const calls = [];
let steps = [];
let payments = [];
db.query = async (sql, params) => {
  calls.push({ sql, params });
  if (/FROM customer_onboarding_steps s/.test(sql)) return [steps];
  if (/INSERT INTO customer_onboarding_steps/.test(sql)) { steps.push({ id: `0000000${steps.length}-0000-0000-0000-000000000000`.slice(-36), step_key: params[2], title: params[3], sort_order: params[4], is_done: params[5], due_date: params[7], is_custom: /is_custom/.test(sql) ? 1 : 0 }); return [{ affectedRows: 1 }]; }
  if (/FROM customer_payments p LEFT JOIN users u ON u.user_id = p.recorded_by\s+WHERE p.company_id/.test(sql)) return [payments];
  if (/INSERT INTO customer_payments/.test(sql)) { payments.push({ id: 'p1', amount: params[2], paid_on: params[3], mode: params[4] }); return [[{ id: 'p1' }]]; }
  if (/SELECT advance_received FROM leads/.test(sql)) return [[{ advance_received: 25000 }]];
  return [[]];
};
const customerService = require('../services/customerService');
let customer = { customer_id: 'CST1', company_id: 'C1', total_value: 100000, assigned_to: 'U1', status: 'active', created_at: new Date().toISOString(), converted_from_lead_id: 'L9' };
customerService.getCustomer = async () => customer;
require('../repositories/customerActivityRepository').createActivity = async () => {};
require('../repositories/auditRepository').createLog = async () => {};

const money = require('../services/customers/customerMoney');
const onboarding = require('../services/customers/customerOnboarding');
const { customerHealth } = require('../services/customers/customerHealth');
const admin = { companyId: 'C1', userId: 'A1', role: 'admin', name: 'Admin' };

test('money: paid, pending, lead advance hint and payment rules', async () => {
  payments = [];
  let m = await money.getMoney(admin, 'CST1');
  assert.equal(m.pending, 100000);
  assert.equal(m.lead_advance, 25000, 'suggests the advance taken on the lead');
  await assert.rejects(() => money.addPayment(admin, 'CST1', { amount: 0, mode: 'upi' }), /amount/);
  await assert.rejects(() => money.addPayment(admin, 'CST1', { amount: 5000, mode: 'bitcoin' }), /how it was paid/);
  await assert.rejects(() => money.addPayment(admin, 'CST1', { amount: 5000, mode: 'upi', paid_on: '2099-01-01' }), /future/);
  await assert.rejects(() => money.addPayment({ ...admin, role: 'viewer' }, 'CST1', { amount: 5000, mode: 'upi' }), /cannot record/);
  calls.length = 0;
  m = await money.addPayment(admin, 'CST1', { amount: 40000, mode: 'upi', reference: 'UTR123', next_payment_date: '2026-12-01' });
  assert.equal(m.paid, 40000);
  assert.equal(m.pending, 60000);
  assert.ok(calls.some((c) => /step_key = 'advance'/.test(c.sql)), 'ticks the advance step');
  assert.ok(calls.some((c) => /UPDATE customers SET next_payment_date/.test(c.sql)));
  await assert.rejects(() => money.deletePayment({ ...admin, role: 'sales' }, 'CST1', 'x'), /Only admins/);
  for (const c of calls) assert.equal((c.sql.match(/\?/g) || []).length, c.params.length, c.sql.slice(0, 60));
});

test('onboarding: default checklist, ticking steps moves the status', async () => {
  steps = [];
  let o = await onboarding.getOnboarding(admin, 'CST1');
  assert.equal(o.steps.length, onboarding.DEFAULT_STEPS.length);
  assert.equal(o.status, 'pending');
  steps[0].is_done = 1;
  o = await onboarding.getOnboarding(admin, 'CST1');
  assert.equal(o.status, 'in-progress');
  assert.equal(o.summary.percent, 13);
  steps.forEach((s) => { s.is_done = 1; });
  o = await onboarding.getOnboarding(admin, 'CST1');
  assert.equal(o.status, 'done');
  await assert.rejects(() => onboarding.addStep(admin, 'CST1', { title: '  ' }), /name/);
  await assert.rejects(() => onboarding.updateStep(admin, 'CST1', 'not-a-guid', { is_done: true }), /not found/);
  await assert.rejects(() => onboarding.updateStep({ ...admin, role: 'viewer' }, 'CST1', steps[0].id, { is_done: true }), /View-only/);
});

test('health score explains itself', () => {
  const past = new Date(Date.now() - 5 * 86400000).toISOString();
  const h = customerHealth({ status: 'active', total_value: 1000, paid_amount: 0, next_payment_date: past, next_follow_up: past, created_at: new Date().toISOString() });
  assert.equal(h.level, 'risk');
  assert.deepEqual(h.reasons, ['Payment overdue', 'Follow-up missed']);
  assert.equal(customerHealth({ status: 'active', total_value: 1000, paid_amount: 1000, created_at: new Date().toISOString(), onboarding_status: 'done' }).level, 'good');
  assert.equal(customerHealth({ status: 'inactive' }).level, 'inactive');
});

test('money filters only take known values and never put input into SQL', async () => {
  const repo = require('../repositories/customerRepository');
  const seen = [];
  const exec = { query: async (sql, params) => { seen.push({ sql, params }); return [/COUNT\(\*\) AS total/.test(sql) ? [{ total: 0, active: 0 }] : []]; } };
  await repo.listCustomers({ companyId: 'C1', payment: 'overdue', onboarding: "x'; DROP", renewal: 'soon', includeSummary: true, sort: 'pending' }, { offset: 0, limit: 25 }, exec);
  assert.match(seen[0].sql, /c\.next_payment_date < SYSUTCDATETIME\(\)/);
  assert.doesNotMatch(seen[0].sql, /DROP/);
  assert.match(seen[1].sql, /ORDER BY \(COALESCE\(c\.total_value, 0\) - pay\.paid_amount\) DESC/);
  assert.ok(seen.some((c) => /pending_amount/.test(c.sql) && !/next_payment_date < SYSUTCDATETIME\(\)\)\s*AND/.test(c.sql.split('WHERE')[1] || '')), 'tiles ignore the quick filter');
  for (const c of seen) assert.equal((c.sql.match(/\?/g) || []).length, c.params.length);
});

test('Excel: chosen sheets and columns, pending sheet only shows people who owe money', async () => {
  const repo = require('../repositories/customerRepository');
  customerService.buildCustomerFilters = async () => ({ companyId: 'C1' });
  repo.listCustomers = async () => ({ rows: [
    { customer_id: 'CST1', company_name: 'Kapoor Steels', name: 'Mr. Mehta', total_value: 100000, paid_amount: 40000, status: 'active', onboarding_status: 'in-progress', onboarding_steps_total: 8, onboarding_steps_done: 4, created_at: new Date().toISOString() },
    { customer_id: 'CST2', company_name: 'Delta Foods', name: 'Ms. Rao', total_value: 50000, paid_amount: 50000, status: 'active', onboarding_status: 'done', created_at: new Date().toISOString() },
  ] });
  const { buildCustomerWorkbook } = require('../services/customers/customerExport');
  const { buffer } = await buildCustomerWorkbook(admin, { sheets: 'customers,pending,onboarding', cols_customers: 'company,pending,health' }, { generatedBy: 'Admin' });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  assert.deepEqual(wb.worksheets.map((w) => w.name), ['Customers', 'Money pending', 'Onboarding']);
  const header = (ws) => ws.getRow([...Array(10).keys()].find((i) => ws.getRow(i + 1).getCell(1).value === 'Company') + 1).values.filter(Boolean);
  assert.deepEqual(header(wb.getWorksheet('Customers')), ['Company', 'Pending', 'Health']);
  const pendingSheet = wb.getWorksheet('Money pending');
  const text = JSON.stringify(pendingSheet.getSheetValues());
  assert.match(text, /Kapoor Steels/);
  assert.doesNotMatch(text, /Delta Foods/);
});
