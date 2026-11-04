const { test } = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');

// Stub data access before the services capture their dependencies.
const db = require('../db/connection');
const calls = [];
db.query = async (sql, params) => {
  calls.push({ sql, params });
  if (/GROUP BY COALESCE\(NULLIF\(LTRIM\(RTRIM\(l\.lead_source\)\), ''\), 'not-set'\), COALESCE\(u\.name/.test(sql)) {
    return [[{ source: 'website', owner: 'Rahul', team: 'Delhi', total: 5, won: 1 }, { source: 'referral', owner: 'Rahul', team: 'Delhi', total: 2, won: 1 }, { source: 'website', owner: 'Priya', team: 'Noida', total: 3, won: 0 }]];
  }
  if (/AS name, COUNT\(\*\) AS total/.test(sql)) return [[{ name: 'website', total: 8, won: 1, lost: 1, still_open: 6, value: 100000, won_value: 50000 }]];
  if (/AS day, COUNT/.test(sql)) return [[{ day: '2026-11-02', total: 3, won: 1 }]];
  if (/COUNT\(\*\) AS added/.test(sql)) return [[{ added: 10, won: 2, lost: 1, still_open: 7, value: 200000, won_value: 90000 }]];
  if (/FROM lead_notes n\s+INNER JOIN/.test(sql)) return [[{ total: 14 }]];
  if (/FROM users u\s+WHERE u.company_id/.test(sql)) return [[{ user_id: 'U1', name: 'Rahul', role: 'sales', last_login_at: null, updates: 4, leads_added: 2, calls: 1, last_note: null, last_activity: null }]];
  return [[]];
};
const leadRepository = require('../repositories/leadRepository');
leadRepository.getLeadCounts = async () => ({ open_leads: 7, pipeline_value: 300000, overdue: 3, today: 1, advance_received: 20000, pending_amount: 50000 });
leadRepository.listLeads = async () => ({ rows: [{ lead_id: 'L1', company_name: 'Kapoor', status: 'contacted', follow_up_date: new Date().toISOString() }], total: 1 });
const taskService = require('../services/taskService');
taskService.listTasks = async () => ({ items: [], meta: { total: 2 } });
const leadService = require('../services/leadService');
const seenScope = [];
leadService.buildLeadFilters = async (auth, query) => { seenScope.push({ role: auth.role, query }); return { companyId: 'C1', teamIds: auth.role === 'manager' ? ['T1'] : null, viewerUserId: auth.role === 'sales' ? auth.userId : undefined }; };
const teamRepository = require('../repositories/teamRepository');
teamRepository.listUsersForTeams = async () => ['U1'];

const { getInsights, allowedWidgets, parseRange } = require('../services/dashboard/insightsService');
const { buildDashboardReport, reportCatalog } = require('../services/dashboard/dashboardReport');
const admin = { companyId: 'C1', userId: 'A1', role: 'admin', name: 'Admin' };
const sales = { companyId: 'C1', userId: 'S1', role: 'sales' };

test('each role only gets the widgets it may see', () => {
  assert.deepEqual(allowedWidgets('sales', 'kpis,team,usage,myday'), ['kpis', 'myday']);
  assert.ok(allowedWidgets('manager').includes('team'));
  assert.ok(!allowedWidgets('legal-team').includes('myday'));
  assert.deepEqual(allowedWidgets('viewer', 'payments,kpis'), ['kpis']);
});

test('sales cannot pick another person; managers can', async () => {
  seenScope.length = 0;
  await getInsights(sales, { widgets: 'kpis', assigned_to: 'U9' });
  assert.equal(seenScope[0].query.assigned_to, undefined);
  await getInsights({ ...admin, role: 'manager' }, { widgets: 'kpis', assigned_to: 'U9' });
  assert.equal(seenScope[1].query.assigned_to, 'U9');
});

test('date range is in India time, defaults to 30 days and is checked', () => {
  const r = parseRange({ from: '2026-11-01', to: '2026-11-03' });
  assert.equal(r.start.toISOString(), '2026-10-31T18:30:00.000Z');
  assert.equal(r.end.toISOString(), '2026-11-03T18:29:59.999Z');
  const d = parseRange({ to: '2026-11-30' });
  assert.equal(d.from, '2026-11-01');
  assert.throws(() => parseRange({ from: '2026-11-05', to: '2026-11-01' }), /before/);
  assert.throws(() => parseRange({ from: '2025-01-01', to: '2026-11-01' }), /one year/);
});

test('roles without this dashboard are refused', async () => {
  await assert.rejects(() => getInsights({ ...admin, role: 'expert' }, {}), /not available/);
});

test('widgets come back filled, and the trend has every day', async () => {
  const res = await getInsights(admin, { from: '2026-11-01', to: '2026-11-03', widgets: 'kpis,sources,trend,usage,myday' });
  assert.equal(res.widgets.kpis.data.cohort.added, 10);
  assert.equal(res.widgets.kpis.data.updates, 14);
  assert.equal(res.widgets.kpis.data.tasks.overdue, 2);
  assert.equal(res.widgets.sources.data[0].name, 'website');
  assert.deepEqual(res.widgets.trend.data.map((d) => d.day), ['2026-11-01', '2026-11-02', '2026-11-03']);
  assert.equal(res.widgets.trend.data[1].total, 3);
  assert.equal(res.widgets.usage.data[0].quiet, true);
  assert.equal(res.widgets.myday.data.overdue.items[0].leadId, 'L1');
});

test('every SQL statement lines up its values with its placeholders', async () => {
  calls.length = 0;
  await getInsights(admin, { from: '2026-11-01', to: '2026-11-03' });
  assert.ok(calls.length > 5);
  for (const call of calls) assert.equal((call.sql.match(/\?/g) || []).length, call.params.length, call.sql.slice(0, 120));
});

test('report: sales cannot get people sheets; matrix pivots sources by person', async () => {
  assert.ok(!reportCatalog('sales').some((s) => ['owners', 'usage', 'sourceOwner'].includes(s.key)));
  assert.ok(reportCatalog('admin').some((s) => s.key === 'sourceOwner'));
  const { buffer } = await buildDashboardReport(admin, { from: '2026-11-01', to: '2026-11-03', sheets: 'summary,sourceOwner,sources' });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  assert.deepEqual(wb.worksheets.map((s) => s.name), ['Summary', 'Source by person', 'Lead sources']);
  const ws = wb.getWorksheet('Source by person');
  let h = 1;
  while (ws.getCell(h, 1).value !== 'Person') h += 1;
  assert.deepEqual(ws.getRow(h).values.slice(1), ['Person', 'Team', 'Referral', 'Website', 'Total']);
  assert.deepEqual(ws.getRow(h + 1).values.slice(1, 6), ['Rahul', 'Delhi', 2, 5, 7]);
});

test('all time has no start date and a monthly trend', async () => {
  const r = parseRange({ period: 'all' });
  assert.equal(r.all, true);
  assert.equal(r.from, null);
  calls.length = 0;
  const res = await getInsights(admin, { period: 'all', widgets: 'kpis,trend' });
  assert.equal(res.range.all, true);
  assert.ok(calls.some((c) => /varchar\(7\)/.test(c.sql)), 'monthly trend query');
  for (const call of calls) assert.equal((call.sql.match(/\?/g) || []).length, call.params.length);
});

test('custom charts only accept known settings, and respect the role', async () => {
  const { getCustomChart } = require('../services/dashboard/insightsService');
  await assert.rejects(() => getCustomChart(admin, { dimension: 'l.id; drop', measure: 'count' }), /group by/);
  await assert.rejects(() => getCustomChart(admin, { dimension: 'source', measure: 'sum(x)' }), /count/);
  await assert.rejects(() => getCustomChart(sales, { dimension: 'owner', measure: 'count' }), /admins and managers/);
  await assert.rejects(() => getCustomChart({ ...sales, role: 'viewer' }, { dimension: 'source', measure: 'advance' }), /money/);
  calls.length = 0;
  await getCustomChart(sales, { dimension: 'city', measure: 'won', period: 'all' });
  const sql = calls.find((c) => /TOP 60/.test(c.sql));
  assert.match(sql.sql, /address_city/);
  assert.equal((sql.sql.match(/\?/g) || []).length, sql.params.length);
});
