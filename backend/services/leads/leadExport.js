const ExcelJS = require('exceljs');
const { query: dbQuery } = require('../../db/connection');
const leadService = require('../leadService');
const { parseNote } = require('../recentUpdates/noteParser');
const kit = require('../reports/sheetKit');

const { ist, istDay, label, statusTone } = kit;
const PAGE = 1000;
const MAX_PAGES = 20;
const MAX_UPDATES = 15;
const CLOSED = ['closed-won', 'closed-lost'];
const STATUS_ORDER = ['new', 'pending', 'contacted', 'on-hold', 'qualified', 'proposal', 'negotiation', 'booked-demo', 'demo-done', 'trial-started', 'closed-won', 'onboarded', 'closed-lost'];

const num = (value) => Number(value || 0);
const isOpen = (lead) => !CLOSED.includes(String(lead.status || '').toLowerCase());
const isOverdue = (lead, now) => isOpen(lead) && lead.follow_up_date && new Date(lead.follow_up_date).getTime() < now;
const pending = (lead) => Math.max(0, num(lead.total_lead_value || lead.estimated_value) - num(lead.advance_received));
const priorityTone = (p) => ({ urgent: 'danger', high: 'warn', medium: 'info', low: 'neutral' }[String(p || '').toLowerCase()] || null);
const company = (lead) => lead.company_name || lead.contact_person || '';

/** One line for an update in the Lead history sheet. */
function summariseNote(note) {
  const [written] = String(note.content || '').split(/\n\s*Changes:\s*\n/i);
  const p = parseNote(written);
  const parts = [];
  if (p.statusTo) parts.push(p.statusFrom ? `${p.statusFrom} → ${p.statusTo}` : `Status: ${p.statusTo}`);
  if (p.callStatus) parts.push(p.callStatus);
  if (p.response) parts.push(`Response: ${p.response}`);
  if (p.demoAt) parts.push(`Demo: ${p.demoAt}`);
  if (p.note) parts.push(p.note.replace(/\s*\n\s*/g, ' '));
  if (p.nextFollowUp) parts.push(`Next: ${p.nextFollowUp}`);
  return `${parts.join(' · ') || 'Updated'} — ${note.created_by_name || 'Unknown'}`;
}

function groupStats(leads, keyOf, now) {
  const groups = new Map();
  for (const lead of leads) {
    const name = keyOf(lead) || 'Not set';
    if (!groups.has(name)) groups.set(name, { name, teams: new Set(), total: 0, open: 0, won: 0, lost: 0, overdue: 0, value: 0, advance: 0, pending: 0 });
    const g = groups.get(name);
    g.total += 1;
    if (lead.team_name) g.teams.add(lead.team_name);
    if (isOpen(lead)) g.open += 1;
    if (lead.status === 'closed-won') g.won += 1;
    if (lead.status === 'closed-lost') g.lost += 1;
    if (isOverdue(lead, now)) g.overdue += 1;
    g.value += num(lead.estimated_value);
    g.advance += num(lead.advance_received);
    g.pending += pending(lead);
  }
  return [...groups.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

const winRate = (g) => (g.won + g.lost ? g.won / (g.won + g.lost) : null);
const groupColumns = (header, withTeam = false) => [
  { key: 'name', header, bold: true, value: (g) => g.name },
  ...(withTeam ? [{ key: 'team', header: 'Team', value: (g) => [...g.teams].join(', ') }] : []),
  { key: 'total', header: 'Leads', format: 'int', total: true, value: (g) => g.total },
  { key: 'open', header: 'Open', format: 'int', total: true, value: (g) => g.open },
  { key: 'won', header: 'Won', format: 'int', total: true, value: (g) => g.won },
  { key: 'lost', header: 'Lost', format: 'int', total: true, value: (g) => g.lost },
  { key: 'rate', header: 'Win rate', format: 'pct', value: winRate },
  { key: 'overdue', header: 'Overdue follow-ups', format: 'int', total: true, tone: (g) => (g.overdue ? 'danger' : null), value: (g) => g.overdue },
  { key: 'value', header: 'Lead value', format: 'inr', total: true, value: (g) => g.value },
  { key: 'advance', header: 'Advance received', format: 'inr', total: true, value: (g) => g.advance },
  { key: 'pending', header: 'Pending amount', format: 'inr', total: true, optional: true, value: (g) => g.pending },
];

const CATALOG = [
  { key: 'summary', label: 'Summary', description: 'Totals, status, owners, sources and payments' },
  {
    key: 'leads', label: 'Leads', description: 'One row per lead',
    options: [{ key: 'group', label: 'Group rows by', choices: [['none', 'No grouping'], ['owner', 'Owner'], ['status', 'Status'], ['source', 'Source'], ['product', 'Product'], ['team', 'Team']] }],
    columns: [
      { key: 'company', header: 'Company', bold: true, linked: true, value: company },
      { key: 'contact', header: 'Contact person', value: (l) => l.contact_person },
      { key: 'phone', header: 'Phone', value: (l) => l.phone },
      { key: 'email', header: 'Email', value: (l) => l.email },
      { key: 'status', header: 'Status', tone: (l) => statusTone(l.status), value: (l) => label(l.status) },
      { key: 'priority', header: 'Priority', tone: (l) => priorityTone(l.priority), value: (l) => label(l.priority) },
      { key: 'product', header: 'Product', value: (l) => l.product_name },
      { key: 'source', header: 'Source', value: (l) => label(l.lead_source) },
      { key: 'owner', header: 'Owner', value: (l) => l.assigned_to_name },
      { key: 'team', header: 'Team', value: (l) => l.team_name },
      { key: 'value', header: 'Lead value', format: 'inr', total: true, value: (l) => num(l.estimated_value) },
      { key: 'followUp', header: 'Next follow-up', format: 'datetime', value: (l) => ist(l.follow_up_date) },
      { key: 'created', header: 'Created on', format: 'date', value: (l) => istDay(l.created_at) },
      { key: 'updated', header: 'Last changed', format: 'datetime', value: (l) => ist(l.updated_at) },
      { key: 'latestNote', header: 'Latest note', wrap: true, maxWidth: 50, value: (l) => l.latest_note },
      { key: 'notes', header: 'Notes count', format: 'int', optional: true, value: (l) => num(l.note_count) },
      { key: 'createdBy', header: 'Created by', optional: true, value: (l) => l.created_by_name },
      { key: 'workflow', header: 'Workflow stage', optional: true, value: (l) => label(l.workflow_stage) },
      { key: 'industry', header: 'Industry', optional: true, value: (l) => l.industry },
      { key: 'units', header: 'Number of units', format: 'int', optional: true, value: (l) => l.number_of_units },
      { key: 'requirements', header: 'Requirements', optional: true, wrap: true, maxWidth: 40, value: (l) => l.requirements },
      { key: 'city', header: 'City', optional: true, value: (l) => l.address_city },
      { key: 'state', header: 'State', optional: true, value: (l) => l.address_state },
      { key: 'lostReason', header: 'Lost reason', optional: true, wrap: true, maxWidth: 34, value: (l) => l.lost_reason },
      { key: 'onboarded', header: 'Onboarded on', format: 'date', optional: true, value: (l) => istDay(l.onboarded_date) },
      { key: 'id', header: 'Lead ID', optional: true, value: (l) => l.lead_id },
    ],
  },
  { key: 'owners', label: 'By owner', description: 'Each person: open, won, lost, overdue, value', columns: groupColumns('Owner', true) },
  { key: 'sources', label: 'By source', description: 'Which source brings and converts leads', columns: groupColumns('Source') },
  { key: 'products', label: 'By product', description: 'Leads and value per product', columns: groupColumns('Product') },
  {
    key: 'funnel', label: 'Status funnel', description: 'Leads and value at each status',
    columns: [
      { key: 'status', header: 'Status', bold: true, tone: (r) => statusTone(r.status), value: (r) => r.status },
      { key: 'count', header: 'Leads', format: 'int', total: true, value: (r) => r.count },
      { key: 'share', header: 'Share', format: 'pct', value: (r) => r.share },
      { key: 'value', header: 'Lead value', format: 'inr', total: true, value: (r) => r.value },
    ],
  },
  {
    key: 'payments', label: 'Payments', description: 'Leads with a value or advance',
    columns: [
      { key: 'company', header: 'Company', bold: true, linked: true, value: company },
      { key: 'contact', header: 'Contact person', value: (l) => l.contact_person },
      { key: 'owner', header: 'Owner', value: (l) => l.assigned_to_name },
      { key: 'status', header: 'Status', tone: (l) => statusTone(l.status), value: (l) => label(l.status) },
      { key: 'total', header: 'Total value', format: 'inr', total: true, value: (l) => num(l.total_lead_value || l.estimated_value) },
      { key: 'advance', header: 'Advance received', format: 'inr', total: true, value: (l) => num(l.advance_received) },
      { key: 'pending', header: 'Pending', format: 'inr', total: true, tone: (l) => (pending(l) > 0 ? 'warn' : null), value: pending },
      { key: 'mode', header: 'Payment mode', value: (l) => label(l.payment_mode) },
      { key: 'paidOn', header: 'Payment date', format: 'date', value: (l) => istDay(l.payment_date) },
      { key: 'nextPayment', header: 'Next payment', format: 'date', value: (l) => istDay(l.next_payment_date) },
      { key: 'tenure', header: 'Client tenure', optional: true, value: (l) => l.client_tenure },
    ],
  },
  {
    key: 'followups', label: 'Follow-ups', description: 'Open leads with a follow-up date',
    options: [{ key: 'which', label: 'Show', choices: [['all', 'All follow-ups'], ['overdue', 'Only overdue']] }],
    columns: [
      { key: 'date', header: 'Follow-up', format: 'datetime', value: (l) => ist(l.follow_up_date) },
      { key: 'state', header: 'Due', tone: (l) => (l.__overdue ? 'danger' : null), value: (l) => (l.__overdue ? 'Overdue' : 'Upcoming') },
      { key: 'days', header: 'Days overdue', format: 'int', value: (l) => (l.__overdue ? Math.max(1, Math.floor((Date.now() - new Date(l.follow_up_date)) / 86400000)) : null) },
      { key: 'company', header: 'Company', bold: true, linked: true, value: company },
      { key: 'contact', header: 'Contact person', value: (l) => l.contact_person },
      { key: 'phone', header: 'Phone', value: (l) => l.phone },
      { key: 'owner', header: 'Owner', value: (l) => l.assigned_to_name },
      { key: 'status', header: 'Status', tone: (l) => statusTone(l.status), value: (l) => label(l.status) },
      { key: 'priority', header: 'Priority', tone: (l) => priorityTone(l.priority), value: (l) => label(l.priority) },
      { key: 'note', header: 'Latest note', wrap: true, maxWidth: 50, value: (l) => l.latest_note },
    ],
  },
  {
    key: 'history', label: 'Lead history', description: 'One row per lead with Update 1, 2, 3…',
    options: [{ key: 'updates', label: 'Updates to show', choices: [['10', 'Up to 10'], ['5', 'Up to 5'], ['15', 'Up to 15']] }],
    columns: [
      { key: 'company', header: 'Company', bold: true, linked: true, value: company },
      { key: 'contact', header: 'Contact person', value: (l) => l.contact_person },
      { key: 'phone', header: 'Phone', value: (l) => l.phone },
      { key: 'owner', header: 'Owner', value: (l) => l.assigned_to_name },
      { key: 'status', header: 'Status', tone: (l) => statusTone(l.status), value: (l) => label(l.status) },
      { key: 'count', header: 'Updates', format: 'int', value: (l) => (l.__notes || []).length },
    ],
  },
];

const DEFAULT_SHEETS = ['summary', 'leads', 'owners', 'sources'];

function option(q, sheet, key, fallback) {
  const value = String(q[`${key}_${sheet}`] || '');
  const def = CATALOG.find((s) => s.key === sheet).options.find((o) => o.key === key);
  return def.choices.some(([k]) => k === value) ? value : fallback;
}

/** Notes for the chosen leads, oldest first, keyed by lead. */
async function loadNotes(leads) {
  const byLead = new Map();
  const ids = leads.map((l) => l.lead_id);
  for (let i = 0; i < ids.length; i += 500) {
    const part = ids.slice(i, i + 500);
    const [rows] = await dbQuery(
      `SELECT ln.lead_id, ln.content, ln.created_at, u.name AS created_by_name
       FROM lead_notes ln
       LEFT JOIN users u ON u.user_id = ln.created_by AND u.company_id = ln.company_id
       WHERE ln.lead_id IN (${part.map(() => '?').join(',')})
       ORDER BY ln.created_at ASC, ln.id ASC`,
      part
    );
    rows.forEach((row) => {
      if (!byLead.has(row.lead_id)) byLead.set(row.lead_id, []);
      byLead.get(row.lead_id).push(row);
    });
  }
  return byLead;
}

/** Loads the leads the viewer may see with the page's current filters. */
async function loadLeadExport(auth, q) {
  const { sheets, filter_label: _label, ...filters } = q;
  const params = { ...filters, include_workflow_summary: '0', export_all: '1', page_size: String(PAGE) };
  const leads = [];
  let capped = true;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const result = await leadService.listLeads(auth, { ...params, page: String(page) });
    leads.push(...(result.items || []));
    if ((result.items || []).length < PAGE) { capped = false; break; }
  }
  const wanted = String(sheets || '').split(',');
  if (wanted.includes('history') && leads.length) {
    const notes = await loadNotes(leads);
    leads.forEach((lead) => { lead.__notes = notes.get(lead.lead_id) || []; });
  }
  return { leads, capped };
}

async function buildLeadWorkbook(data, meta, q = {}) {
  const now = Date.now();
  const lines = [`${data.leads.length.toLocaleString('en-IN')} leads${meta.filters ? ` · ${meta.filters}` : ''}`, `Generated ${kit.generatedAt()} IST by ${meta.generatedBy}`];
  if (data.capped) lines.push(`Large export: only the first ${(PAGE * MAX_PAGES).toLocaleString('en-IN')} leads are included. Add a filter for the rest.`);
  const full = { ...meta, title: 'GreenCRM — Leads Report', lines };
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GreenCRM';
  workbook.created = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;
  const link = (columns) => columns.map((c) => (c.linked && meta.appUrl ? { ...c, link: (l) => `${meta.appUrl}/leads/${encodeURIComponent(l.lead_id)}` } : c));
  const leads = data.leads;
  const owners = groupStats(leads, (l) => l.assigned_to_name || 'Unassigned', now);
  const sources = groupStats(leads, (l) => label(l.lead_source), now);
  const products = groupStats(leads, (l) => l.product_name, now);
  const funnel = [...new Set([...STATUS_ORDER, ...leads.map((l) => l.status)])].filter(Boolean).map((status) => {
    const list = leads.filter((l) => l.status === status);
    return { status: label(status), count: list.length, share: leads.length ? list.length / leads.length : 0, value: list.reduce((sum, l) => sum + num(l.estimated_value), 0) };
  }).filter((r) => r.count);

  for (const { sheet, columns } of kit.resolveLayout(CATALOG, q, DEFAULT_SHEETS)) {
    if (sheet.key === 'summary') {
      const { section, line, table } = kit.summaryWriter(workbook, full);
      section('Leads');
      line('Total leads', leads.length);
      line('Open', leads.filter(isOpen).length);
      line('Won', leads.filter((l) => l.status === 'closed-won').length);
      line('Lost', leads.filter((l) => l.status === 'closed-lost').length);
      line('Overdue follow-ups', leads.filter((l) => isOverdue(l, now)).length, 'Open leads past their follow-up date');
      line('Unassigned', leads.filter((l) => !l.assigned_to).length);
      section('Money');
      line('Lead value', leads.reduce((sum, l) => sum + num(l.estimated_value), 0), '', 'inr');
      line('Advance received', leads.reduce((sum, l) => sum + num(l.advance_received), 0), '', 'inr');
      line('Pending amount', leads.reduce((sum, l) => sum + pending(l), 0), '', 'inr');
      section('By status');
      table(['Status', 'Leads', 'Share'], funnel.map((r) => [r.status, r.count, r.share]), [null, 'int', 'pct']);
      section('Top owners');
      table(['Owner', 'Leads', 'Won'], owners.slice(0, 15).map((g) => [g.name, g.total, g.won]), [null, 'int', 'int']);
      section('Top sources');
      table(['Source', 'Leads', 'Won'], sources.slice(0, 15).map((g) => [g.name, g.total, g.won]), [null, 'int', 'int']);
    } else if (sheet.key === 'leads') {
      const group = option(q, 'leads', 'group', 'none');
      const groupBy = { owner: (l) => l.assigned_to_name || 'Unassigned', status: (l) => label(l.status), source: (l) => label(l.lead_source) || 'Not set', product: (l) => l.product_name || 'Not set', team: (l) => l.team_name || 'No team' }[group];
      const rows = groupBy ? [...leads].sort((a, b) => groupBy(a).localeCompare(groupBy(b))) : leads;
      kit.addDataSheet(workbook, { name: 'Leads', columns: link(columns), rows, groupBy, freezeColumns: 1, empty: 'No leads match these filters.' }, full);
    } else if (sheet.key === 'owners') {
      kit.addDataSheet(workbook, { name: 'By owner', columns, rows: owners, freezeColumns: 1, empty: 'No leads match these filters.' }, full);
    } else if (sheet.key === 'sources') {
      kit.addDataSheet(workbook, { name: 'By source', columns, rows: sources, empty: 'No leads match these filters.' }, full);
    } else if (sheet.key === 'products') {
      kit.addDataSheet(workbook, { name: 'By product', columns, rows: products, empty: 'No leads match these filters.' }, full);
    } else if (sheet.key === 'funnel') {
      kit.addDataSheet(workbook, { name: 'Status funnel', columns, rows: funnel, empty: 'No leads match these filters.' }, full);
    } else if (sheet.key === 'payments') {
      const rows = leads.filter((l) => num(l.estimated_value) > 0 || num(l.advance_received) > 0).sort((a, b) => pending(b) - pending(a));
      kit.addDataSheet(workbook, { name: 'Payments', tabColor: kit.GOLD, columns: link(columns), rows, freezeColumns: 1, empty: 'No lead has a value or advance.' }, full);
    } else if (sheet.key === 'followups') {
      const which = option(q, 'followups', 'which', 'all');
      const rows = leads.filter((l) => isOpen(l) && l.follow_up_date).map((l) => ({ ...l, __overdue: isOverdue(l, now) }))
        .filter((l) => which === 'all' || l.__overdue).sort((a, b) => new Date(a.follow_up_date) - new Date(b.follow_up_date));
      kit.addDataSheet(workbook, { name: 'Follow-ups', tabColor: kit.GOLD, columns: link(columns), rows, empty: 'No follow-ups to show.' }, full);
    } else if (sheet.key === 'history') {
      const updates = Math.min(MAX_UPDATES, Number(option(q, 'history', 'updates', '10')));
      const extra = [];
      for (let i = 1; i <= updates; i++) {
        extra.push({ key: `d${i}`, header: `Update ${i} date`, format: 'datetime', value: (l) => (l.__notes?.[i - 1] ? ist(l.__notes[i - 1].created_at) : null) });
        extra.push({ key: `u${i}`, header: `Update ${i}`, wrap: true, maxWidth: 42, value: (l) => (l.__notes?.[i - 1] ? summariseNote(l.__notes[i - 1]) : null) });
      }
      kit.addDataSheet(workbook, { name: 'Lead history', columns: [...link(columns), ...extra], rows: leads, freezeColumns: 1, empty: 'No leads match these filters.' }, full);
    }
  }
  return workbook.xlsx.writeBuffer();
}

const leadExportCatalog = () => kit.catalogFor(CATALOG).map((sheet) => ({ ...sheet, selectedByDefault: DEFAULT_SHEETS.includes(sheet.key) }));

module.exports = { loadLeadExport, buildLeadWorkbook, leadExportCatalog, summariseNote, CATALOG, DEFAULT_SHEETS };
