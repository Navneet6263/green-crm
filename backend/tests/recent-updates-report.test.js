const { test } = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const { parseNote } = require('../services/recentUpdates/noteParser');
const { analyse, buildUpdatesWorkbook } = require('../services/recentUpdates/updatesWorkbook');

test('reads the status dialog note format', () => {
  const p = parseNote('Status changed: Contacted -> Qualified\nCustomer response: Interested\n\nNote:\nWants pricing for 20 users\n\nNext follow-up: 2026-10-30 11:00\nMode: call');
  assert.equal(p.kind, 'status');
  assert.equal(p.statusFrom, 'Contacted');
  assert.equal(p.statusTo, 'Qualified');
  assert.equal(p.response, 'Interested');
  assert.equal(p.note, 'Wants pricing for 20 users');
  assert.equal(p.nextFollowUp, '2026-10-30 11:00');
  assert.equal(p.mode, 'call');
});

test('reads follow-up, demo and plain notes', () => {
  const f = parseNote('Follow-up Status\nMode: Call\nCalling status: Not answered\nCustomer response: Call back\nNext follow-up: 2026-10-29 16:00\n\nNotes:\nBusy in meeting');
  assert.equal(f.kind, 'followup');
  assert.equal(f.callStatus, 'Not answered');
  assert.equal(f.note, 'Busy in meeting');

  const d = parseNote('Status changed from Qualified to Booked Demo\nRequirement: CRM for 10 reps\nDemo scheduled: 2026-11-02 15:00\nAssigned from Rahul to Priya');
  assert.equal(d.kind, 'demo');
  assert.equal(d.statusTo, 'Booked Demo');
  assert.equal(d.assignedTo, 'Priya');

  const old = parseNote('Status changed: New -> Contacted Customer response: Busy Note: call later Next follow-up: 2026-10-01 10:00 (call)');
  assert.equal(old.response, 'Busy');
  assert.equal(old.note, 'call later');
  assert.equal(old.mode, 'call');

  assert.deepEqual([parseNote('Sent brochure on WhatsApp').kind, parseNote('Sent brochure on WhatsApp').note], ['note', 'Sent brochure on WhatsApp']);
});

const row = (id, by, name, entity, at, content, extra = {}) => ({
  note_type: 'lead', id, entity_id: entity, customer_id: null, content, created_by: by, created_by_name: name, created_by_role: 'sales',
  created_at: new Date(at), entity_company_name: `Company ${entity}`, entity_name: 'Mr. Mehta', entity_status: 'qualified', phone: '9800000000',
  team_id: 'T1', team_name: 'Delhi Sales', product_name: 'CRM', ...extra,
});
const rows = [
  // 20:00 UTC on the 27th is 01:30 IST on the 28th.
  row(1, 'U1', 'Rahul', 'L1', '2026-10-27T20:00:00Z', 'Status changed: New -> Contacted\nCustomer response: Interested'),
  row(2, 'U1', 'Rahul', 'L1', '2026-10-28T06:00:00Z', 'Follow-up Status\nCalling status: Connected\nCustomer response: Send quote\nNext follow-up: 2026-10-30 11:00'),
  row(3, 'U2', 'Priya', 'L2', '2026-10-26T06:00:00Z', 'Called, no answer', { team_name: 'Noida Sales' }),
];

test('totals are grouped by person, team, record and Indian day', () => {
  const data = analyse(rows);
  assert.equal(data.totals.updates, 3);
  assert.equal(data.totals.records, 2);
  assert.equal(data.totals.status, 1);
  assert.equal(data.totals.followups, 1);
  assert.equal(data.totals.nextBooked, 1);
  assert.equal(data.people[0].name, 'Rahul');
  assert.equal(data.people[0].days.get('2026-10-28'), 2);
  assert.deepEqual(data.teams.map((t) => [t.name, t.updates]), [['Delhi Sales', 2], ['Noida Sales', 1]]);
  assert.equal(data.records[0].notes.length, 2);
});

const load = async (buffer) => { const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buffer); return wb; };
const headerRow = (ws) => { for (let r = 1; r < 10; r++) if (ws.getCell(r, 1).value && ws.getRow(r).getCell(1).fill?.fgColor?.argb === 'FF0C605D') return r; return 0; };

test('default workbook has every sheet with India times', async () => {
  const wb = await load(await buildUpdatesWorkbook(rows, { from: '2026-10-26', to: '2026-10-28', filters: ['Leads only'], total: 3, generatedBy: 'Admin' }));
  assert.deepEqual(wb.worksheets.map((ws) => ws.name), ['Summary', 'Activity log', 'By person', 'By team', 'Day by person', 'Lead follow-up sheet']);
  const log = wb.getWorksheet('Activity log');
  const h = headerRow(log);
  assert.equal(log.getCell(h, 1).value, 'Date');
  assert.equal(log.getCell(h + 1, 3).value, 'Rahul');
  const oldest = log.getRow(h + 2);
  assert.equal(oldest.getCell(1).value.toISOString().slice(0, 10), '2026-10-28');
  assert.equal(oldest.getCell(2).value.getUTCHours(), 1);
  const daily = wb.getWorksheet('Day by person');
  const dh = headerRow(daily);
  assert.equal(daily.getCell(dh + 1, 4).value, 2); // Rahul on 28 Oct
});

test('only the chosen sheets and columns are written, in order', async () => {
  const query = { sheets: 'people,log', cols_people: 'name,updates', cols_log: 'company,by,note', group_log: 'person' };
  const wb = await load(await buildUpdatesWorkbook(rows, { from: '2026-10-26', to: '2026-10-28', filters: [], total: 3, generatedBy: 'Admin' }, query));
  assert.deepEqual(wb.worksheets.map((ws) => ws.name), ['By person', 'Activity log']);
  const people = wb.getWorksheet('By person');
  const ph = headerRow(people);
  assert.deepEqual(people.getRow(ph).values.slice(1), ['Name', 'Updates']);
  assert.equal(people.getCell(ph + 3, 1).value, 'Total');
  const log = wb.getWorksheet('Activity log');
  const lh = headerRow(log);
  assert.deepEqual(log.getRow(lh).values.slice(1), ['Company', 'Updated by', 'Note']);
  assert.match(String(log.getCell(lh + 1, 1).value), /^Priya \(1\)$/);
});

test('unknown sheets are rejected', async () => {
  await assert.rejects(() => buildUpdatesWorkbook(rows, { from: '2026-10-26', to: '2026-10-28', filters: [], total: 3, generatedBy: 'A' }, { sheets: 'nope' }), /Unknown report sheet/);
});

test('the system change list is not treated as what the person wrote', () => {
  const p = parseNote('Follow-up Status\nCalling status: Connected\n\nNotes:\nWill confirm Friday\n\nChanges:\nFollow-up date: a -> b');
  assert.equal(p.note, 'Will confirm Friday');
  assert.equal(p.kind, 'followup');
});
