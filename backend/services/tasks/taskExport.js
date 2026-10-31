const ExcelJS = require('exceljs');
const { query: dbQuery } = require('../../db/connection');
const AppError = require('../../utils/appError');
const taskService = require('../taskService');
const leadService = require('../leadService');
const kit = require('../reports/sheetKit');

const { ist, istDay, istTime, label, statusTone } = kit;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PAGE = 1000;
const MAX_PAGES = 10;
const DONE = ['done', 'completed', 'cancelled'];

const istStart = (date) => new Date(`${date}T00:00:00.000+05:30`);
const addDay = (date) => new Date(istStart(date).getTime() + 86400000);
const isDone = (t) => DONE.includes(String(t.status || '').toLowerCase());
const isOverdue = (t, now) => !isDone(t) && new Date(t.due_date).getTime() < now;
const stateOf = (t, now) => (isDone(t) ? label(t.status) : isOverdue(t, now) ? 'Overdue' : label(t.status || 'pending'));
const stateTone = (s) => ({ Overdue: 'danger', Done: 'ok', Completed: 'ok', Cancelled: 'neutral', Pending: 'warn', 'In Progress': 'info' }[s] || statusTone(s));
const priorityTone = (p) => ({ urgent: 'danger', high: 'warn', medium: 'info', low: 'neutral' }[String(p || '').toLowerCase()] || null);
const timed = (value) => { const d = ist(value); return d && (d.getUTCHours() || d.getUTCMinutes()); };
const appLink = (base, t) => {
  if (!base) return null;
  if (t.related_to === 'lead' && t.related_id) return `${base}/leads/${encodeURIComponent(t.related_id)}`;
  if (t.related_to === 'customer' && t.related_id) return `${base}/customers/${encodeURIComponent(t.related_id)}`;
  return `${base}/calendar`;
};

const CATALOG = [
  { key: 'summary', label: 'Summary', description: 'Totals by status, type and person' },
  {
    key: 'tasks', label: 'Tasks', description: 'One row per task',
    options: [{ key: 'group', label: 'Group rows by', choices: [['none', 'No grouping'], ['day', 'Day'], ['person', 'Person'], ['status', 'Status'], ['type', 'Type']] }],
    columns: [
      { key: 'date', header: 'Due date', format: 'date', value: (t) => istDay(t.due_date) },
      { key: 'time', header: 'Time', format: 'time', value: (t) => (timed(t.due_date) ? istTime(t.due_date) : null) },
      { key: 'title', header: 'Task', bold: true, wrap: true, maxWidth: 40, linked: true, value: (t) => t.title },
      { key: 'type', header: 'Type', value: (t) => label(t.type) },
      { key: 'priority', header: 'Priority', tone: (t) => priorityTone(t.priority), value: (t) => label(t.priority) },
      { key: 'state', header: 'Status', tone: (t) => stateTone(t.state), value: (t) => t.state },
      { key: 'assignee', header: 'Assigned to', value: (t) => t.assigned_to_name },
      { key: 'team', header: 'Team', value: (t) => t.team_name },
      { key: 'relatedType', header: 'Linked to', value: (t) => (t.related_to ? label(t.related_to) : '') },
      { key: 'company', header: 'Company', value: (t) => t.related?.company },
      { key: 'contact', header: 'Contact person', value: (t) => t.related?.contact },
      { key: 'phone', header: 'Phone', value: (t) => t.related?.phone },
      { key: 'leadStatus', header: 'Lead status', optional: true, tone: (t) => statusTone(t.related?.status), value: (t) => label(t.related?.status) },
      { key: 'notes', header: 'Notes', wrap: true, maxWidth: 50, value: (t) => t.notes },
      { key: 'daysLate', header: 'Days overdue', format: 'int', optional: true, value: (t) => (t.state === 'Overdue' ? Math.max(1, Math.floor((Date.now() - new Date(t.due_date)) / 86400000)) : null) },
      { key: 'createdBy', header: 'Created by', optional: true, value: (t) => t.created_by_name },
      { key: 'createdAt', header: 'Created on', format: 'datetime', optional: true, value: (t) => ist(t.created_at) },
      { key: 'updatedAt', header: 'Last changed', format: 'datetime', optional: true, value: (t) => ist(t.updated_at) },
      { key: 'id', header: 'Task ID', optional: true, value: (t) => t.task_id },
    ],
  },
  {
    key: 'people', label: 'By person', description: 'Open, done and overdue per person',
    columns: [
      { key: 'name', header: 'Name', bold: true, value: (p) => p.name },
      { key: 'team', header: 'Team', value: (p) => [...p.teams].join(', ') },
      { key: 'total', header: 'Tasks', format: 'int', total: true, value: (p) => p.total },
      { key: 'open', header: 'Open', format: 'int', total: true, value: (p) => p.open },
      { key: 'done', header: 'Done', format: 'int', total: true, value: (p) => p.done },
      { key: 'overdue', header: 'Overdue', format: 'int', total: true, tone: (p) => (p.overdue ? 'danger' : null), value: (p) => p.overdue },
      { key: 'rate', header: 'Done %', format: 'pct', value: (p) => (p.total ? p.done / p.total : 0) },
      { key: 'calls', header: 'Calls', format: 'int', total: true, optional: true, value: (p) => p.types.call || 0 },
      { key: 'meetings', header: 'Meetings & demos', format: 'int', total: true, optional: true, value: (p) => (p.types.meeting || 0) + (p.types.demo || 0) },
      { key: 'next', header: 'Next open task', format: 'datetime', value: (p) => ist(p.next) },
    ],
  },
  {
    key: 'followups', label: 'Lead follow-ups', description: 'Follow-up dates set on leads',
    columns: [
      { key: 'date', header: 'Follow-up date', format: 'date', value: (f) => istDay(f.due_at) },
      { key: 'time', header: 'Time', format: 'time', value: (f) => (timed(f.due_at) ? istTime(f.due_at) : null) },
      { key: 'company', header: 'Company', bold: true, linked: true, value: (f) => f.company_name },
      { key: 'contact', header: 'Contact person', value: (f) => f.contact_person_name },
      { key: 'phone', header: 'Phone', value: (f) => f.phone },
      { key: 'owner', header: 'Owner', value: (f) => f.owner_name },
      { key: 'status', header: 'Lead status', tone: (f) => statusTone(f.status), value: (f) => label(f.status) },
      { key: 'state', header: 'Due', tone: (f) => (f.overdue ? 'danger' : null), value: (f) => (f.overdue ? 'Overdue' : 'Upcoming') },
      { key: 'id', header: 'Lead ID', optional: true, value: (f) => f.lead_id },
    ],
  },
];

function option(queryParams, sheet, key, fallback) {
  const value = String(queryParams[`${key}_${sheet}`] || '');
  const def = CATALOG.find((s) => s.key === sheet).options.find((o) => o.key === key);
  return def.choices.some(([k]) => k === value) ? value : fallback;
}

async function fetchAll(fn, params) {
  const rows = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const result = await fn({ ...params, page: String(page), page_size: String(PAGE), export_all: '1' });
    const items = result.data || result.items || [];
    rows.push(...items);
    if (items.length < PAGE) return { rows, capped: false };
  }
  return { rows, capped: true };
}

const chunks = (list, size = 500) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));

async function lookup(table, idColumn, companyId, ids, select) {
  const map = new Map();
  for (const part of chunks([...new Set(ids.filter(Boolean))])) {
    const [rows] = await dbQuery(`SELECT ${idColumn} AS id, ${select} FROM ${table} WHERE company_id = ? AND ${idColumn} IN (${part.map(() => '?').join(',')})`, [companyId, ...part]);
    rows.forEach((row) => map.set(row.id, row));
  }
  return map;
}

/** Loads the tasks (and lead follow-ups) the viewer may see for the chosen dates and people. */
async function loadExport(auth, q) {
  const from = q.from ? String(q.from) : '';
  const to = q.to ? String(q.to) : '';
  if ((from && !DATE_RE.test(from)) || (to && !DATE_RE.test(to))) throw new AppError('Invalid date. Use YYYY-MM-DD.', 400);
  if (from && to && from > to) throw new AppError('The from date must be before the to date.', 400);

  const scope = {};
  if (q.mine === '1') scope.mine = '1';
  if (q.assigned_to) scope.assigned_to = String(q.assigned_to);
  if (q.team_ids) scope.team_ids = String(q.team_ids);
  const range = { ...(from ? { due_from: istStart(from).toISOString() } : {}), ...(to ? { due_to: addDay(to).toISOString() } : {}) };

  const status = ['open', 'done', 'overdue'].includes(q.status) ? q.status : 'all';
  const now = Date.now();
  const taskResult = await fetchAll((params) => taskService.listTasks(auth, params), { ...scope, ...range, ...(status === 'open' || status === 'overdue' ? { open_only: '1' } : {}) });
  let tasks = taskResult.rows;
  if (status === 'done') tasks = tasks.filter(isDone);
  if (status === 'overdue') tasks = tasks.filter((t) => isOverdue(t, now));
  if (q.type) tasks = tasks.filter((t) => String(t.type) === String(q.type));

  const companyId = auth.companyId;
  const leadIds = tasks.filter((t) => t.related_to === 'lead').map((t) => t.related_id);
  const customerIds = tasks.filter((t) => t.related_to === 'customer').map((t) => t.related_id);
  const leads = companyId ? await lookup('leads', 'lead_id', companyId, leadIds, 'company_name AS company, contact_person AS contact, phone, status') : new Map();
  const customers = companyId ? await lookup('customers', 'customer_id', companyId, customerIds, 'company_name AS company, name AS contact, phone, status') : new Map();
  tasks = tasks.map((t) => ({
    ...t,
    state: stateOf(t, now),
    related: t.related_to === 'lead' ? leads.get(t.related_id) : t.related_to === 'customer' ? customers.get(t.related_id) : null,
  }));

  let followups = [];
  let followupsCapped = false;
  const sheets = String(q.sheets || '').split(',').filter(Boolean);
  if ((!sheets.length || sheets.includes('followups')) && status !== 'done') {
    const fScope = q.mine === '1' ? { user_id: auth.userId } : q.assigned_to ? { user_id: String(q.assigned_to) } : q.team_ids ? { team_ids: String(q.team_ids) } : {};
    const result = await fetchAll((params) => leadService.listReminders(auth, params), { ...fScope, ...range });
    followupsCapped = result.capped;
    const closed = ['closed-won', 'closed-lost', 'won', 'lost', 'completed'];
    followups = result.rows.filter((f) => !closed.includes(String(f.status || '').toLowerCase()));
    if (status === 'overdue') followups = followups.filter((f) => new Date(f.due_at).getTime() < now);
    const leadInfo = companyId ? await lookup('leads', 'lead_id', companyId, followups.map((f) => f.lead_id), 'phone') : new Map();
    const owners = companyId ? await lookup('users', 'user_id', companyId, followups.map((f) => f.assigned_to), 'name') : new Map();
    followups = followups.map((f) => ({ ...f, phone: leadInfo.get(f.lead_id)?.phone, owner_name: owners.get(f.assigned_to)?.name || '', overdue: new Date(f.due_at).getTime() < now }));
  }

  return { tasks, followups, from, to, status, capped: taskResult.capped || followupsCapped };
}

function byPerson(tasks) {
  const people = new Map();
  for (const t of tasks) {
    const key = t.assigned_to || 'none';
    if (!people.has(key)) people.set(key, { name: t.assigned_to_name || 'Unassigned', teams: new Set(), total: 0, open: 0, done: 0, overdue: 0, types: {}, next: null });
    const p = people.get(key);
    p.total += 1;
    if (t.team_name) p.teams.add(t.team_name);
    if (isDone(t)) p.done += 1; else p.open += 1;
    if (t.state === 'Overdue') p.overdue += 1;
    p.types[t.type] = (p.types[t.type] || 0) + 1;
    if (!isDone(t) && new Date(t.due_date).getTime() >= Date.now() && (!p.next || new Date(t.due_date) < new Date(p.next))) p.next = t.due_date;
  }
  return [...people.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

async function buildTaskWorkbook(data, meta, q = {}) {
  const lines = [
    `Period: ${data.from || 'all dates'}${data.to ? ` to ${data.to}` : ''}${meta.filters.length ? ` · ${meta.filters.join(' · ')}` : ''}`,
    `Generated ${kit.generatedAt()} IST by ${meta.generatedBy}`,
  ];
  if (data.capped) lines.push('Large export: only the first 10,000 rows are included. Pick fewer dates for the rest.');
  const full = { ...meta, title: 'GreenCRM — Tasks & Follow-ups', lines };
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GreenCRM';
  workbook.created = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;
  const people = byPerson(data.tasks);
  const link = (columns) => columns.map((c) => (c.linked && meta.appUrl ? { ...c, link: (row) => (row.lead_id ? `${meta.appUrl}/leads/${encodeURIComponent(row.lead_id)}` : appLink(meta.appUrl, row)) } : c));

  for (const { sheet, columns } of kit.resolveLayout(CATALOG, q)) {
    if (sheet.key === 'summary') {
      const { section, line, table } = kit.summaryWriter(workbook, full);
      const count = (fn) => data.tasks.filter(fn).length;
      section('Tasks');
      line('Total tasks', data.tasks.length);
      line('Open', count((t) => !isDone(t)));
      line('Overdue', count((t) => t.state === 'Overdue'), 'Open tasks past their due time');
      line('Done', count(isDone));
      line('Lead follow-ups', data.followups.length, `${data.followups.filter((f) => f.overdue).length} overdue`);
      section('By type');
      const types = new Map();
      data.tasks.forEach((t) => types.set(label(t.type), (types.get(label(t.type)) || 0) + 1));
      table(['Type', 'Tasks'], [...types].sort((a, b) => b[1] - a[1]), [null, 'int']);
      section('By person');
      table(['Name', 'Tasks', 'Overdue'], people.map((p) => [p.name, p.total, p.overdue]), [null, 'int', 'int']);
    } else if (sheet.key === 'tasks') {
      const group = option(q, 'tasks', 'group', 'none');
      const groupBy = {
        day: (t) => istDay(t.due_date).toLocaleDateString('en-IN', { timeZone: 'UTC', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }),
        person: (t) => t.assigned_to_name || 'Unassigned',
        status: (t) => t.state,
        type: (t) => label(t.type),
      }[group];
      const rows = group === 'none' || group === 'day' ? data.tasks : [...data.tasks].sort((a, b) => groupBy(a).localeCompare(groupBy(b)) || new Date(a.due_date) - new Date(b.due_date));
      kit.addDataSheet(workbook, { name: 'Tasks', columns: link(columns), rows, groupBy, freezeColumns: 0, empty: 'No tasks for these dates.' }, full);
    } else if (sheet.key === 'people') {
      kit.addDataSheet(workbook, { name: 'By person', columns, rows: people, freezeColumns: 1, empty: 'No tasks for these dates.' }, full);
    } else if (sheet.key === 'followups') {
      kit.addDataSheet(workbook, { name: 'Lead follow-ups', tabColor: kit.GOLD, columns: link(columns), rows: data.followups, empty: 'No lead follow-ups for these dates.' }, full);
    }
  }
  return workbook.xlsx.writeBuffer();
}

const exportCatalog = () => kit.catalogFor(CATALOG);

module.exports = { loadExport, buildTaskWorkbook, exportCatalog, CATALOG };
