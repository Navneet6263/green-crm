const ExcelJS = require('exceljs');
const { parseNote, KIND_LABELS } = require('./noteParser');
const kit = require('../reports/sheetKit');

const { ist, istDay, istTime, label, statusTone } = kit;
const MAX_DAY_COLUMNS = 62;
const MAX_RECORD_UPDATES = 15;

const keyDate = (key) => new Date(`${key}T00:00:00.000Z`);
const addDays = (key, n) => new Date(keyDate(key).getTime() + n * 86400000).toISOString().slice(0, 10);
const istKey = (value) => ist(value).toISOString().slice(0, 10);
const recordKey = (row) => `${row.note_type}:${row.entity_id || row.customer_id}`;
const kindTone = (kind) => ({ status: 'info', followup: 'ok', demo: 'violet', note: 'warn' }[kind]);

/** Groups notes into per-person, per-team, per-day and per-record totals. */
function analyse(rows) {
  const notes = rows.map((row) => ({ ...row, parsed: parseNote(row.content), day: istKey(row.created_at) }));
  const people = new Map();
  const teams = new Map();
  const records = new Map();
  const statusTo = new Map();
  const products = new Map();
  const totals = { updates: notes.length, leadUpdates: 0, customerUpdates: 0, status: 0, followups: 0, demos: 0, nextBooked: 0, responses: 0 };

  for (const n of notes) {
    const p = n.parsed;
    const isLead = n.note_type === 'lead';
    totals[isLead ? 'leadUpdates' : 'customerUpdates'] += 1;
    if (p.kind === 'status') totals.status += 1;
    if (p.kind === 'followup') totals.followups += 1;
    if (p.kind === 'demo') totals.demos += 1;
    if (p.nextFollowUp) totals.nextBooked += 1;
    if (p.response) totals.responses += 1;
    if (p.statusTo) statusTo.set(p.statusTo, (statusTo.get(p.statusTo) || 0) + 1);
    if (n.product_name) products.set(n.product_name, (products.get(n.product_name) || 0) + 1);

    const personId = n.created_by || 'unknown';
    if (!people.has(personId)) {
      people.set(personId, { id: personId, name: n.created_by_name || 'Unknown user', role: label(n.created_by_role), teams: new Set(), updates: 0, lead: 0, customer: 0,
        status: 0, followups: 0, demos: 0, nextBooked: 0, responses: 0, records: new Set(), days: new Map(), first: null, last: null });
    }
    const person = people.get(personId);
    person.updates += 1;
    person[isLead ? 'lead' : 'customer'] += 1;
    if (p.kind === 'status') person.status += 1;
    if (p.kind === 'followup') person.followups += 1;
    if (p.kind === 'demo') person.demos += 1;
    if (p.nextFollowUp) person.nextBooked += 1;
    if (p.response) person.responses += 1;
    person.records.add(recordKey(n));
    person.days.set(n.day, (person.days.get(n.day) || 0) + 1);
    if (n.team_name) person.teams.add(n.team_name);
    const at = new Date(n.created_at);
    if (!person.first || at < person.first) person.first = at;
    if (!person.last || at > person.last) person.last = at;

    const teamName = n.team_name || 'No team';
    if (!teams.has(teamName)) teams.set(teamName, { name: teamName, updates: 0, people: new Set(), records: new Set(), status: 0, followups: 0, demos: 0, nextBooked: 0 });
    const team = teams.get(teamName);
    team.updates += 1;
    team.people.add(personId);
    team.records.add(recordKey(n));
    if (p.kind === 'status') team.status += 1;
    if (p.kind === 'followup') team.followups += 1;
    if (p.kind === 'demo') team.demos += 1;
    if (p.nextFollowUp) team.nextBooked += 1;

    const rKey = recordKey(n);
    if (!records.has(rKey)) {
      records.set(rKey, { type: isLead ? 'Lead' : 'Customer', id: n.entity_id || n.customer_id, company: n.entity_company_name || n.entity_name || '', contact: n.entity_name || '',
        phone: n.phone || '', email: n.email || '', status: label(n.entity_status), product: n.product_name || '', team: n.team_name || '', requirement: n.requirements || '',
        lostReason: n.lost_reason || '', approvedBy: n.legal_approved_by || '', approvedAt: n.legal_approved_at || null, owners: new Set(), notes: [] });
    }
    const record = records.get(rKey);
    record.owners.add(n.created_by_name || 'Unknown user');
    record.notes.push(n);
  }

  for (const record of records.values()) record.notes.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const byCount = (a, b) => b.updates - a.updates || a.name.localeCompare(b.name);
  return {
    notes,
    totals: { ...totals, people: people.size, records: records.size },
    people: [...people.values()].sort(byCount),
    teams: [...teams.values()].sort(byCount),
    records: [...records.values()].sort((a, b) => new Date(b.notes[b.notes.length - 1].created_at) - new Date(a.notes[a.notes.length - 1].created_at)),
    statusTo: [...statusTo.entries()].sort((a, b) => b[1] - a[1]),
    products: [...products.entries()].sort((a, b) => b[1] - a[1]),
  };
}

/** One-line summary of an update, used in the follow-up sheet. */
function summarise(n) {
  const p = n.parsed;
  const parts = [];
  if (p.statusTo) parts.push(p.statusFrom ? `${p.statusFrom} → ${p.statusTo}` : `Status: ${p.statusTo}`);
  if (p.callStatus) parts.push(p.callStatus);
  if (p.response) parts.push(`Response: ${p.response}`);
  if (p.demoAt) parts.push(`Demo: ${p.demoAt}`);
  if (p.note) parts.push(p.note.replace(/\s*\n\s*/g, ' '));
  if (p.nextFollowUp) parts.push(`Next: ${p.nextFollowUp}`);
  return `${parts.join(' · ') || 'Updated'} — ${n.created_by_name || 'Unknown'}`;
}

const crmLink = (base) => (n) => {
  if (!base) return null;
  const id = n.entity_id || n.customer_id || n.id;
  return id ? `${base}/${n.note_type === 'customer' || n.type === 'Customer' ? 'customers' : 'leads'}/${encodeURIComponent(id)}` : null;
};

/** Every sheet and column people can choose. `optional` columns start switched off. */
const CATALOG = [
  { key: 'summary', label: 'Summary', description: 'Totals, status moves, products and teams' },
  {
    key: 'log', label: 'Activity log', description: 'Every update, one row each',
    options: [{ key: 'group', label: 'Group rows by', choices: [['none', 'No grouping'], ['person', 'Person'], ['day', 'Day'], ['record', 'Lead / customer']] }],
    columns: [
      { key: 'date', header: 'Date', format: 'date', value: (n) => istDay(n.created_at) },
      { key: 'time', header: 'Time', format: 'time', value: (n) => istTime(n.created_at) },
      { key: 'by', header: 'Updated by', bold: true, value: (n) => n.created_by_name || 'Unknown' },
      { key: 'role', header: 'Role', optional: true, value: (n) => label(n.created_by_role) },
      { key: 'team', header: 'Team', value: (n) => n.team_name },
      { key: 'type', header: 'Lead / customer', value: (n) => (n.note_type === 'lead' ? 'Lead' : 'Customer') },
      { key: 'company', header: 'Company', bold: true, linked: true, value: (n) => n.entity_company_name || n.entity_name },
      { key: 'contact', header: 'Contact person', value: (n) => n.entity_name },
      { key: 'phone', header: 'Phone', value: (n) => n.phone },
      { key: 'email', header: 'Email', optional: true, value: (n) => n.email },
      { key: 'product', header: 'Product', value: (n) => n.product_name },
      { key: 'kind', header: 'Update type', tone: (n) => kindTone(n.parsed.kind), value: (n) => KIND_LABELS[n.parsed.kind] },
      { key: 'from', header: 'Status from', value: (n) => n.parsed.statusFrom },
      { key: 'to', header: 'Status to', tone: (n) => statusTone(n.parsed.statusTo), value: (n) => n.parsed.statusTo },
      { key: 'callStatus', header: 'Call / email status', tone: (n) => statusTone(n.parsed.callStatus), value: (n) => n.parsed.callStatus },
      { key: 'response', header: 'Customer response', wrap: true, maxWidth: 34, value: (n) => n.parsed.response },
      { key: 'mode', header: 'Mode', optional: true, value: (n) => n.parsed.mode },
      { key: 'next', header: 'Next follow-up', value: (n) => n.parsed.nextFollowUp },
      { key: 'demo', header: 'Demo scheduled', optional: true, value: (n) => n.parsed.demoAt },
      { key: 'requirement', header: 'Requirement', optional: true, wrap: true, maxWidth: 34, value: (n) => n.parsed.requirement || n.requirements },
      { key: 'note', header: 'Note', wrap: true, maxWidth: 50, value: (n) => n.parsed.note },
      { key: 'fullNote', header: 'Full note as written', optional: true, wrap: true, maxWidth: 60, value: (n) => n.content },
      { key: 'currentStatus', header: 'Current status', tone: (n) => statusTone(n.entity_status), value: (n) => label(n.entity_status) },
      { key: 'id', header: 'Record ID', optional: true, value: (n) => n.entity_id || n.customer_id },
    ],
  },
  {
    key: 'people', label: 'By person', description: 'Who updated how much',
    columns: [
      { key: 'name', header: 'Name', bold: true, value: (p) => p.name },
      { key: 'role', header: 'Role', value: (p) => p.role },
      { key: 'team', header: 'Team', value: (p) => [...p.teams].join(', ') },
      { key: 'updates', header: 'Updates', format: 'int', total: true, value: (p) => p.updates },
      { key: 'records', header: 'Records updated', format: 'int', total: true, value: (p) => p.records.size },
      { key: 'lead', header: 'Lead updates', format: 'int', total: true, optional: true, value: (p) => p.lead },
      { key: 'customer', header: 'Customer updates', format: 'int', total: true, optional: true, value: (p) => p.customer },
      { key: 'status', header: 'Status changes', format: 'int', total: true, value: (p) => p.status },
      { key: 'followups', header: 'Follow-up calls', format: 'int', total: true, value: (p) => p.followups },
      { key: 'demos', header: 'Demos booked', format: 'int', total: true, value: (p) => p.demos },
      { key: 'nextBooked', header: 'Next follow-ups set', format: 'int', total: true, value: (p) => p.nextBooked },
      { key: 'responses', header: 'Responses recorded', format: 'int', total: true, optional: true, value: (p) => p.responses },
      { key: 'activeDays', header: 'Active days', format: 'int', value: (p) => p.days.size },
      { key: 'avg', header: 'Avg per active day', format: 'decimal', value: (p) => (p.days.size ? p.updates / p.days.size : 0) },
      { key: 'first', header: 'First update', format: 'datetime', optional: true, value: (p) => ist(p.first) },
      { key: 'last', header: 'Last update', format: 'datetime', value: (p) => ist(p.last) },
    ],
  },
  {
    key: 'teams', label: 'By team', description: 'Team totals, based on the team of each lead',
    columns: [
      { key: 'name', header: 'Team', bold: true, value: (t) => t.name },
      { key: 'updates', header: 'Updates', format: 'int', total: true, value: (t) => t.updates },
      { key: 'people', header: 'People active', format: 'int', value: (t) => t.people.size },
      { key: 'records', header: 'Records updated', format: 'int', total: true, value: (t) => t.records.size },
      { key: 'status', header: 'Status changes', format: 'int', total: true, value: (t) => t.status },
      { key: 'followups', header: 'Follow-up calls', format: 'int', total: true, value: (t) => t.followups },
      { key: 'demos', header: 'Demos booked', format: 'int', total: true, value: (t) => t.demos },
      { key: 'nextBooked', header: 'Next follow-ups set', format: 'int', total: true, value: (t) => t.nextBooked },
      { key: 'share', header: 'Share of updates', format: 'pct', value: (t) => t.share },
    ],
  },
  { key: 'daily', label: 'Day by person', description: 'Grid of updates per person per day' },
  {
    key: 'records', label: 'Lead follow-up sheet', description: 'One row per lead with its updates in order',
    options: [{ key: 'history', label: 'Updates to show', choices: [['15', 'Up to 15'], ['10', 'Up to 10'], ['5', 'Up to 5'], ['0', 'None']] }],
    columns: [
      { key: 'type', header: 'Type', value: (r) => r.type },
      { key: 'company', header: 'Company', bold: true, linked: true, value: (r) => r.company },
      { key: 'contact', header: 'Contact person', value: (r) => r.contact },
      { key: 'phone', header: 'Phone', value: (r) => r.phone },
      { key: 'email', header: 'Email', optional: true, value: (r) => r.email },
      { key: 'status', header: 'Current status', tone: (r) => statusTone(r.status), value: (r) => r.status },
      { key: 'product', header: 'Product', value: (r) => r.product },
      { key: 'team', header: 'Team', value: (r) => r.team },
      { key: 'owners', header: 'Updated by', value: (r) => [...r.owners].join(', ') },
      { key: 'count', header: 'Updates', format: 'int', total: true, value: (r) => r.notes.length },
      { key: 'first', header: 'First update', format: 'datetime', optional: true, value: (r) => ist(r.notes[0].created_at) },
      { key: 'last', header: 'Last update', format: 'datetime', value: (r) => ist(r.notes[r.notes.length - 1].created_at) },
      { key: 'lastResponse', header: 'Last customer response', wrap: true, maxWidth: 34, value: (r) => [...r.notes].reverse().find((n) => n.parsed.response)?.parsed.response },
      { key: 'nextFollowUp', header: 'Next follow-up', value: (r) => [...r.notes].reverse().find((n) => n.parsed.nextFollowUp)?.parsed.nextFollowUp },
      { key: 'requirement', header: 'Requirement', optional: true, wrap: true, maxWidth: 34, value: (r) => r.requirement },
      { key: 'lostReason', header: 'Lost reason', optional: true, wrap: true, value: (r) => r.lostReason },
      { key: 'approvedBy', header: 'Approved by', optional: true, value: (r) => r.approvedBy },
      { key: 'approvedAt', header: 'Approval date', format: 'date', optional: true, value: (r) => (r.approvedAt ? istDay(r.approvedAt) : null) },
      { key: 'id', header: 'Record ID', optional: true, value: (r) => r.id },
    ],
  },
];

const option = (query, sheet, key, fallback) => {
  const value = String(query[`${key}_${sheet}`] || '');
  const def = CATALOG.find((s) => s.key === sheet).options.find((o) => o.key === key);
  return def.choices.some(([k]) => k === value) ? value : fallback;
};

function withLinks(columns, appUrl) {
  return columns.map((c) => (c.linked && appUrl ? { ...c, link: crmLink(appUrl) } : c));
}

function addSummary(workbook, data, meta) {
  const { section, line, table } = kit.summaryWriter(workbook, meta);
  const t = data.totals;
  section('Totals');
  line('Total updates', t.updates, `${t.leadUpdates} on leads · ${t.customerUpdates} on customers`);
  line('Leads & customers updated', t.records, 'Different records touched');
  line('People who updated', t.people);
  line('Status changes', t.status);
  line('Follow-up calls logged', t.followups);
  line('Demos booked', t.demos);
  line('Next follow-ups scheduled', t.nextBooked);
  line('Customer responses recorded', t.responses);
  section('Moved to status');
  table(['Status', 'Times'], data.statusTo.map(([k, v]) => [k, v]), [null, 'int']);
  section('Teams');
  table(['Team', 'Updates', 'People'], data.teams.map((x) => [x.name, x.updates, x.people.size]), [null, 'int', 'int']);
  section('Top people');
  table(['Name', 'Updates', 'Records'], data.people.slice(0, 15).map((x) => [x.name, x.updates, x.records.size]), [null, 'int', 'int']);
  if (data.products.length) {
    section('Products');
    table(['Product', 'Updates'], data.products.map(([k, v]) => [k, v]), [null, 'int']);
  }
}

function addDaily(workbook, data, meta) {
  const days = [];
  for (let key = meta.from; key <= meta.to && days.length < MAX_DAY_COLUMNS; key = addDays(key, 1)) days.push(key);
  const columns = [
    { key: 'name', header: 'Name', bold: true, value: (p) => p.name },
    ...days.map((key) => ({ key, header: keyDate(key).toLocaleDateString('en-IN', { timeZone: 'UTC', day: '2-digit', month: 'short' }), format: 'int', total: true,
      fixedWidth: true, width: 8, tone: (p) => ((p.days.get(key) || 0) >= Math.max(1, data.dailyHigh) ? 'ok' : null), value: (p) => p.days.get(key) || 0 })),
    { key: 'total', header: 'Total', format: 'int', total: true, bold: true, value: (p) => p.updates },
  ];
  kit.addDataSheet(workbook, {
    name: 'Day by person', columns, rows: data.people, freezeColumns: 1,
    note: `Green cells are each person's busiest days (${data.dailyHigh}+ updates).${days.length === MAX_DAY_COLUMNS ? ` Shows the first ${MAX_DAY_COLUMNS} days.` : ''}`,
  }, meta);
}

function addRecords(workbook, data, meta, columns, query) {
  const history = Number(option(query, 'records', 'history', '15'));
  const extra = [];
  for (let i = 1; i <= Math.min(history, MAX_RECORD_UPDATES); i++) {
    extra.push({ key: `d${i}`, header: `Update ${i} date`, format: 'datetime', value: (r) => (r.notes[i - 1] ? ist(r.notes[i - 1].created_at) : null) });
    extra.push({ key: `u${i}`, header: `Update ${i}`, wrap: true, maxWidth: 42, value: (r) => (r.notes[i - 1] ? summarise(r.notes[i - 1]) : null) });
  }
  kit.addDataSheet(workbook, {
    name: 'Lead follow-up sheet', tabColor: kit.GOLD, rows: data.records, freezeColumns: 2,
    columns: [{ key: 'sno', header: 'S.No', format: 'int', value: (r) => data.records.indexOf(r) + 1 }, ...withLinks(columns, meta.appUrl), ...extra],
    empty: 'No lead or customer was updated in this period.',
  }, meta);
}

/**
 * Builds the Recent Updates report from the chosen layout.
 * meta: { from, to, filters: string[], generatedBy, total, appUrl? }
 */
async function buildUpdatesWorkbook(rows, meta, query = {}) {
  const data = analyse(rows);
  const dayCounts = data.people.flatMap((p) => [...p.days.values()]).sort((a, b) => b - a);
  data.dailyHigh = dayCounts.length ? dayCounts[Math.floor(dayCounts.length * 0.2)] : 1;
  data.teams.forEach((t) => { t.share = data.totals.updates ? t.updates / data.totals.updates : 0; });

  const lines = [
    `Period: ${meta.from} to ${meta.to}${meta.filters.length ? ` · ${meta.filters.join(' · ')}` : ''}`,
    `Generated ${kit.generatedAt()} IST by ${meta.generatedBy}`,
  ];
  if (meta.total > rows.length) lines.push(`Showing the latest ${rows.length.toLocaleString('en-IN')} of ${meta.total.toLocaleString('en-IN')} updates. Narrow the dates for a full report.`);
  const full = { ...meta, title: 'GreenCRM — Recent Updates Report', lines };

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GreenCRM';
  workbook.created = new Date();
  workbook.calcProperties.fullCalcOnLoad = true; // totals are formulas
  const layout = kit.resolveLayout(CATALOG, query);
  const sorted = [...data.notes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  for (const { sheet, columns } of layout) {
    if (sheet.key === 'summary') addSummary(workbook, data, full);
    else if (sheet.key === 'daily') addDaily(workbook, data, full);
    else if (sheet.key === 'records') addRecords(workbook, data, full, columns, query);
    else if (sheet.key === 'log') {
      const group = option(query, 'log', 'group', 'none');
      const groupBy = { person: (n) => n.created_by_name || 'Unknown', day: (n) => keyDate(n.day).toLocaleDateString('en-IN', { timeZone: 'UTC', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }),
        record: (n) => n.entity_company_name || n.entity_name || 'Unknown' }[group];
      const rowsFor = group === 'person' || group === 'record' ? [...sorted].sort((a, b) => groupBy(a).localeCompare(groupBy(b)) || new Date(b.created_at) - new Date(a.created_at)) : sorted;
      kit.addDataSheet(workbook, { name: 'Activity log', columns: withLinks(columns, meta.appUrl), rows: rowsFor, groupBy, empty: 'No updates in this period.' }, full);
    } else if (sheet.key === 'people') {
      kit.addDataSheet(workbook, { name: 'By person', columns, rows: data.people, freezeColumns: 1, empty: 'Nobody wrote an update in this period.' }, full);
    } else if (sheet.key === 'teams') {
      kit.addDataSheet(workbook, { name: 'By team', columns, rows: data.teams, empty: 'No updates in this period.' }, full);
    }
  }
  return workbook.xlsx.writeBuffer();
}

const reportCatalog = () => kit.catalogFor(CATALOG);

module.exports = { analyse, buildUpdatesWorkbook, reportCatalog, CATALOG };
