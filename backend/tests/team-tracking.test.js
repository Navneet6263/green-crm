const { test } = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');

// Stub data access before the service captures its dependencies.
const scope = require('../services/accessScopeService');
const teamRepository = require('../repositories/teamRepository');
const repo = require('../repositories/teamTrackingRepository');
scope.getAccessibleTeamIds = async (auth) => (auth.role === 'manager' ? ['T1'] : null);
teamRepository.listUsersForTeams = async () => ['U1', 'U2'];

const service = require('../services/tracking/teamTrackingService');
const { buildRoute } = require('../services/tracking/routeModel');
const { buildEmployeeWorkbook, buildTeamWorkbook } = require('../services/tracking/trackingWorkbook');

const admin = { companyId: 'C1', userId: 'A1', role: 'admin' };
const manager = { companyId: 'C1', userId: 'M1', role: 'manager' };
const sales = { companyId: 'C1', userId: 'U1', role: 'sales' };
const iso = (ms) => new Date(ms).toISOString();
const point = (id, at, lat, lng, extra = {}) => ({ event_id: id, session_id: 'S1', kind: 'point', captured_at: iso(at), latitude: lat, longitude: lng, accuracy: 10, mocked: false, label: null, ...extra });

test('route distance matches the app rules and skips mocked fixes', () => {
  const t = Date.parse('2026-10-16T05:00:00Z');
  const route = buildRoute([
    point('a', t, 28.6, 77.3),
    point('b', t + 60000, 28.601, 77.3),
    point('c', t + 120000, 28.9, 77.9, { mocked: true }),
    point('d', t + 180000, 28.602, 77.3),
    point('e', t + 240000, 28.602, 77.3, { kind: 'reach', label: 'Sharma Traders' }),
  ]);
  assert.equal(route.rejected, 1);
  assert.equal(route.stops.length, 1);
  assert.ok(route.metres > 100 && route.metres < 120, `metres ${route.metres}`);
});

test('live board reports live, idle and off and scopes sales to themselves', async () => {
  const now = Date.now();
  let requested;
  repo.listLatestPositions = async (companyId, ids) => {
    requested = ids;
    return [
      { user_id: 'U1', name: 'Asha', session_id: 'S1', started_at: iso(now - 3600e3), stopped_at: null, latitude: 28.6, longitude: 77.3, accuracy: 9, last_fix_at: iso(now - 60e3), mocked: false, visits_today: 2 },
      { user_id: 'U2', name: 'Ravi', session_id: 'S2', started_at: iso(now - 3600e3), stopped_at: null, latitude: 28.6, longitude: 77.3, accuracy: 9, last_fix_at: iso(now - 30 * 60e3), mocked: false, visits_today: 0 },
      { user_id: 'U3', name: 'Neha', session_id: 'S3', started_at: iso(now - 7200e3), stopped_at: iso(now - 3600e3), latitude: null, longitude: null, last_fix_at: null, visits_today: 1 },
    ];
  };
  const board = await service.getLiveBoard(admin);
  assert.equal(requested, null);
  assert.deepEqual(board.employees.map((e) => e.status), ['live', 'idle', 'off']);
  assert.deepEqual(board.counts, { total: 3, live: 1, idle: 1, off: 1 });
  await service.getLiveBoard(sales);
  assert.deepEqual(requested, ['U1']);
  await service.getLiveBoard(manager);
  assert.deepEqual(requested.sort(), ['M1', 'U1', 'U2']);
});

test('managers cannot open employees outside their teams; other roles are refused', async () => {
  repo.listTrackableUsers = async (companyId, ids) => ids.map((id) => ({ user_id: id, name: id }));
  await assert.rejects(service.getEmployeeDay(manager, 'U9', '2026-10-16'), /only view employees in your teams/);
  await assert.rejects(service.getEmployeeDay(sales, 'U2', '2026-10-16'), /only view employees in your teams/);
  await assert.rejects(service.getLiveBoard({ companyId: 'C1', userId: 'L1', role: 'legal-team' }), /do not have access/);
});

test('employee day uses the IST calendar day and summarises trips and visits', async () => {
  const start = Date.parse('2026-10-16T03:30:00Z'); // 09:00 IST
  let window;
  repo.listTrackableUsers = async (companyId, ids) => (ids || ['U1']).map((id) => ({ user_id: id, name: 'Asha' }));
  repo.listSessionsBetween = async (c, u, from, to) => { window = [from.toISOString(), to.toISOString()]; return [{ session_id: 'S1', started_at: iso(start), stopped_at: iso(start + 3600e3) }]; };
  repo.listEventsForSessions = async () => ({ truncated: false, events: [
    point('a', start + 60e3, 28.6, 77.3),
    point('b', start + 120e3, 28.61, 77.3),
    point('c', start + 180e3, 28.61, 77.3, { kind: 'reach', label: 'City Hospital' }),
  ] });
  repo.listAttendanceBetween = async () => [];
  repo.listLeadActivityBetween = async () => [{ type: 'note', created_at: iso(start) }];
  repo.listCallsBetween = async () => [];
  const day = await service.getEmployeeDay(admin, 'U1', '2026-10-16');
  assert.deepEqual(window, ['2026-10-15T18:30:00.000Z', '2026-10-16T18:30:00.000Z']);
  assert.equal(day.trips.length, 1);
  assert.equal(day.trips[0].minutes, 60);
  assert.equal(day.visits[0].label, 'City Hospital');
  assert.equal(day.totals.visits, 1);
  assert.equal(day.totals.lead_updates, 1);
  assert.ok(day.totals.km > 1.1 && day.totals.km < 1.12);
  await assert.rejects(service.getEmployeeReport(admin, 'U1', '2026-09-01', '2026-10-16'), /up to 31 days/);
});

test('excel workbooks open with summary formulas, map links and every sheet', async () => {
  const report = await service.getEmployeeReport(admin, 'U1', '2026-10-15', '2026-10-16');
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(await buildEmployeeWorkbook(report, 'Admin'));
  assert.deepEqual(book.worksheets.map((s) => s.name), ['Summary', 'Visits', 'Trips', 'Route points', 'Attendance', 'Lead activity', 'Calls']);
  const summary = book.getWorksheet('Summary');
  const formulas = [];
  summary.eachRow((row) => row.eachCell((cell) => { if (cell.formula) formulas.push(cell.formula); }));
  assert.ok(formulas.some((f) => f.startsWith('SUM(F')), 'distance total formula');
  const link = book.getWorksheet('Visits').getRow(2).getCell(8).value;
  assert.match(link.hyperlink, /^https:\/\/www\.google\.com\/maps\?q=28\.610000,77\.300000$/);

  const team = new ExcelJS.Workbook();
  await team.xlsx.load(await buildTeamWorkbook(await service.getTeamReport(admin, '2026-10-16', '2026-10-16'), 'Admin'));
  assert.deepEqual(team.worksheets.map((s) => s.name), ['Team summary', 'Daily', 'Visits']);
});
