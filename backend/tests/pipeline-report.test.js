const { test } = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');

// Stub the data before the report captures it.
const leadService = require('../services/leadService');
const workflowService = require('../services/workflowService');
const workflowRepository = require('../repositories/workflowRepository');
const row = (dimension, key, leads, won, extra = {}) => ({ dimension, key, leads, won, value: leads * 1000, won_value: won * 1000, open_leads: leads - won, open_value: (leads - won) * 1000, ...extra });
leadService.getAnalytics = async () => ({
  from_date: '2026-10-04T00:00:00Z', to_date: '2026-11-04T00:00:00Z',
  rows: [
    row('total', 'total', 30, 6), row('status', 'proposal', 12, 0), row('status', 'closed-won', 6, 6), row('status', 'new', 12, 0),
    row('workflow', 'sales', 24, 0), row('workflow', 'legal', 6, 6), row('owner', 'U1', 20, 5, { label: 'Rahul Sharma' }), row('owner', 'unassigned', 10, 1),
    row('source', 'website', 18, 4), row('product', 'P1', 30, 6, { label: 'GreenCRM Pro' }), row('priority', 'high', 9, 3),
    row('day', '2026-11-02', 4, 1), row('day', '2026-11-03', 5, 0), row('day', '2026-10-28', 3, 1),
  ],
});
let trackerQuery = null;
workflowService.buildTrackerFilters = async (auth, q) => { trackerQuery = q; return { companyId: 'C1' }; };
workflowRepository.listWorkflowLeads = async () => ({ total: 1, rows: [{ lead_id: 'LD1', company_name: 'Orbit Pharma', contact_person: 'Mr. Mehta', workflow_stage: 'legal', status: 'closed-won', priority: 'high', assigned_to_name: 'Rahul Sharma', legal_owner_name: 'Asha', estimated_value: 250000, doc_count: 2, updated_at: '2026-11-03T10:00:00Z' }] });

const report = require('../services/pipeline/pipelineReport');
const admin = { role: 'admin', name: 'Navneet', companyId: 'C1', userId: 'A1' };

async function open(query) {
  const { buffer } = await report.buildPipelineReport(admin, query);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  return wb;
}
const texts = (ws) => { const out = []; ws.eachRow((r) => r.eachCell((c) => out.push(String(c.value?.result ?? c.value ?? '')))); return out.join(' | '); };

test('default report has summary, breakdowns and the workflow leads list', async () => {
  const wb = await open({ range: 'month', wf_stage: 'legal' });
  assert.deepEqual(wb.worksheets.map((w) => w.name), ['Summary', 'Status', 'Workflow stage', 'People', 'Lead sources', 'Workflow leads']);
  assert.match(texts(wb.getWorksheet('Summary')), /Leads \| 30/);
  assert.match(texts(wb.getWorksheet('People')), /Rahul Sharma/);
  assert.match(texts(wb.getWorksheet('Workflow leads')), /Orbit Pharma/);
  assert.equal(trackerQuery.stage, 'legal', 'Workflow tab filters reach the tracker sheet');
});

test('chosen sheets, columns and weekly trend', async () => {
  const wb = await open({ sheets: 'trend,owners', cols_owners: 'name,won', by_trend: 'week' });
  assert.deepEqual(wb.worksheets.map((w) => w.name), ['Over time', 'People']);
  const people = texts(wb.getWorksheet('People'));
  assert.match(people, /Owner \| Won/);
  assert.doesNotMatch(people, /Open pipeline/);
  assert.deepEqual(report.rollUp([{ key: '2026-11-02', leads: 4, won: 1, value: 0 }, { key: '2026-11-03', leads: 5, won: 0, value: 0 }, { key: '2026-10-28', leads: 3, won: 1, value: 0 }], 'week').map((r) => [r.period, r.leads]), [['2026-10-26', 3], ['2026-11-02', 9]]);
});

test('marketing gets no workflow leads sheet in the picker', () => {
  assert.equal(report.reportCatalog('marketing').some((s) => s.key === 'tracker'), false);
  assert.equal(report.reportCatalog('admin').some((s) => s.key === 'tracker'), true);
});
