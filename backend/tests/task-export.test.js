const { test } = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');

// Stub data access before the export captures its dependencies.
const db = require('../db/connection');
const taskService = require('../services/taskService');
const leadService = require('../services/leadService');
const seen = [];
db.query = async (sql, params) => {
  if (sql.includes('FROM leads')) return [[{ id: 'LD1', company: 'Kapoor Steels', contact: 'Mr. Kapoor', phone: '9800000001', status: 'qualified' }]];
  if (sql.includes('FROM users')) return [[{ id: 'U1', name: 'Rahul' }]];
  return [[]];
};
const now = Date.now();
const iso = (ms) => new Date(ms).toISOString();
taskService.listTasks = async (auth, params) => {
  seen.push(params);
  const rows = [
    { task_id: 'T1', title: 'Call Kapoor', type: 'call', priority: 'high', status: 'pending', due_date: iso(now - 86400000), assigned_to: 'U1', assigned_to_name: 'Rahul', team_name: 'Delhi', related_to: 'lead', related_id: 'LD1' },
    { task_id: 'T2', title: 'Send quote', type: 'email', priority: 'low', status: 'done', due_date: iso(now - 3600000), assigned_to: 'U1', assigned_to_name: 'Rahul', team_name: 'Delhi' },
    { task_id: 'T3', title: 'Demo', type: 'demo', priority: 'medium', status: 'pending', due_date: iso(now + 86400000), assigned_to: 'U2', assigned_to_name: 'Priya', team_name: 'Noida' },
  ];
  return { items: params.open_only === '1' ? rows.filter((r) => r.status !== 'done') : rows, meta: {} };
};
leadService.listReminders = async () => ({ items: [{ lead_id: 'LD1', company_name: 'Kapoor Steels', contact_person_name: 'Mr. Kapoor', due_at: iso(now - 7200000), assigned_to: 'U1', status: 'qualified' }], meta: {} });

const { loadExport, buildTaskWorkbook } = require('../services/tasks/taskExport');
const auth = { companyId: 'C1', userId: 'A1', role: 'admin' };
const load = async (buffer) => { const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buffer); return wb; };
const findHeader = (ws, text) => { for (let r = 1; r < 10; r++) if (ws.getCell(r, 1).value === text) return r; return 0; };

test('passes India-day range and scope to the task list', async () => {
  seen.length = 0;
  await loadExport(auth, { from: '2026-10-28', to: '2026-10-28', assigned_to: 'U1', sheets: 'tasks' });
  assert.equal(seen[0].assigned_to, 'U1');
  assert.equal(seen[0].due_from, '2026-10-27T18:30:00.000Z');
  assert.equal(seen[0].due_to, '2026-10-28T18:30:00.000Z');
  assert.equal(seen[0].export_all, '1');
});

test('marks overdue tasks, links leads and filters by status', async () => {
  const data = await loadExport(auth, {});
  assert.deepEqual(data.tasks.map((t) => t.state), ['Overdue', 'Done', 'Pending']);
  assert.equal(data.tasks[0].related.company, 'Kapoor Steels');
  assert.equal(data.followups[0].owner_name, 'Rahul');
  assert.equal(data.followups[0].overdue, true);
  const overdue = await loadExport(auth, { status: 'overdue' });
  assert.deepEqual(overdue.tasks.map((t) => t.task_id), ['T1']);
  await assert.rejects(() => loadExport(auth, { from: '28-10-2026' }), /Invalid date/);
});

test('workbook follows the chosen sheets, columns and grouping', async () => {
  const data = await loadExport(auth, {});
  const q = { sheets: 'tasks,people', cols_tasks: 'title,state,assignee', group_tasks: 'person' };
  const wb = await load(await buildTaskWorkbook(data, { filters: [], generatedBy: 'Admin' }, q));
  assert.deepEqual(wb.worksheets.map((ws) => ws.name), ['Tasks', 'By person']);
  const ws = wb.getWorksheet('Tasks');
  const h = findHeader(ws, 'Task');
  assert.deepEqual(ws.getRow(h).values.slice(1), ['Task', 'Status', 'Assigned to']);
  assert.equal(ws.getCell(h + 1, 1).value, 'Priya (1)');
  assert.equal(ws.getCell(h + 4, 2).value, 'Overdue');

  const all = await load(await buildTaskWorkbook(data, { filters: [], generatedBy: 'Admin' }, {}));
  assert.deepEqual(all.worksheets.map((s) => s.name), ['Summary', 'Tasks', 'By person', 'Lead follow-ups']);
});
