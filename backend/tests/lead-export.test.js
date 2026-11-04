const { test } = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');

// Stub data access before the export captures its dependencies.
const db = require('../db/connection');
const leadService = require('../services/leadService');
const seen = [];
db.query = async (sql) => {
  if (sql.includes('FROM lead_notes')) {
    return [[
      { lead_id: 'L1', content: 'Status changed: New -> Contacted\nCustomer response: Interested\n\nChanges:\nstatus: new -> contacted', created_at: new Date('2026-10-20T05:00:00Z'), created_by_name: 'Rahul' },
      { lead_id: 'L1', content: 'Called, no answer', created_at: new Date('2026-10-21T05:00:00Z'), created_by_name: 'Rahul' },
    ]];
  }
  return [[]];
};
const iso = (ms) => new Date(ms).toISOString();
const now = Date.now();
const LEADS = [
  { lead_id: 'L1', company_name: 'Kapoor Steels', contact_person: 'Mr. Kapoor', phone: '9800000001', status: 'contacted', priority: 'high', assigned_to: 'U1', assigned_to_name: 'Rahul', team_name: 'Delhi', lead_source: 'website', product_name: 'CRM', estimated_value: 200000, advance_received: 50000, follow_up_date: iso(now - 86400000), created_at: iso(now - 864000000) },
  { lead_id: 'L2', company_name: 'Orbit Pharma', contact_person: 'Ms. Arora', phone: '9800000002', status: 'closed-won', priority: 'medium', assigned_to: 'U2', assigned_to_name: 'Priya', team_name: 'Noida', lead_source: 'referral', product_name: 'CRM', estimated_value: 100000, advance_received: 100000, created_at: iso(now - 864000000) },
  { lead_id: 'L3', company_name: 'Delta Foods', contact_person: 'Dr. Iyer', phone: '9800000003', status: 'new', priority: 'low', lead_source: 'website', created_at: iso(now - 86400000) },
];
leadService.listLeads = async (auth, params) => { seen.push(params); return { items: params.page === '1' ? LEADS.map((l) => ({ ...l })) : [], meta: {} }; };

const { loadLeadExport, buildLeadWorkbook, summariseNote } = require('../services/leads/leadExport');
const auth = { companyId: 'C1', userId: 'A1', role: 'admin' };
const meta = { filters: '', generatedBy: 'Admin' };
const load = async (buffer) => { const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buffer); return wb; };
const header = (ws, text) => { for (let r = 1; r < 10; r++) if (ws.getCell(r, 1).value === text) return r; return 0; };

test('passes the page filters to the normal lead list', async () => {
  seen.length = 0;
  await loadLeadExport(auth, { status: 'new', follow_up: 'overdue', sheets: 'leads', cols_leads: 'company', filter_label: 'x' });
  assert.equal(seen[0].status, 'new');
  assert.equal(seen[0].follow_up, 'overdue');
  assert.equal(seen[0].export_all, '1');
  assert.equal(seen[0].sheets, undefined);
});

test('default report has the four usual sheets', async () => {
  const wb = await load(await buildLeadWorkbook(await loadLeadExport(auth, {}), meta, {}));
  assert.deepEqual(wb.worksheets.map((s) => s.name), ['Summary', 'Leads', 'By owner', 'By source']);
});

test('only the chosen columns are written, with grouping', async () => {
  const q = { sheets: 'leads', cols_leads: 'phone,company,status', group_leads: 'owner' };
  const wb = await load(await buildLeadWorkbook(await loadLeadExport(auth, q), meta, q));
  const ws = wb.getWorksheet('Leads');
  const h = header(ws, 'Phone');
  assert.deepEqual(ws.getRow(h).values.slice(1), ['Phone', 'Company', 'Status']);
  assert.equal(ws.getCell(h + 1, 1).value, 'Priya (1)');
});

test('owners, payments, follow-ups and history add up', async () => {
  const q = { sheets: 'owners,payments,followups,funnel,history', which_followups: 'overdue', updates_history: '5' };
  const wb = await load(await buildLeadWorkbook(await loadLeadExport(auth, q), meta, q));
  const owners = wb.getWorksheet('By owner');
  const oh = header(owners, 'Owner');
  const rahul = [oh + 1, oh + 2, oh + 3].map((r) => owners.getRow(r)).find((r) => r.getCell(1).value === 'Rahul');
  assert.equal(rahul.getCell(3).value, 1);
  const pay = wb.getWorksheet('Payments');
  const ph = header(pay, 'Company');
  assert.equal(pay.getCell(ph + 1, 1).value, 'Kapoor Steels');
  assert.equal(pay.getCell(ph + 1, 7).value, 150000);
  const fu = wb.getWorksheet('Follow-ups');
  const fh = header(fu, 'Follow-up');
  assert.equal(fu.getCell(fh + 1, 2).value, 'Overdue');
  const hist = wb.getWorksheet('Lead history');
  const hh = header(hist, 'Company');
  assert.equal(hist.getCell(hh + 1, 6).value, 2);
  assert.match(String(hist.getCell(hh + 1, 8).value), /New → Contacted · Response: Interested — Rahul/);
});

test('a note summary drops the system change list', () => {
  const text = summariseNote({ content: 'Called the owner\n\nChanges:\nstatus: new -> contacted', created_by_name: 'A' });
  assert.equal(text, 'Called the owner — A');
});
