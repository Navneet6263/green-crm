import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPagedList } from '../src/hooks/pagedList';
import { emptyLeadFilters, filterParams, validateFilters } from '../src/features/leads/leadFilters';
import { collectExport, csvCell, leadsCsv } from '../src/features/leads/leadExport';
import { hasValue, leadFields } from '../src/features/leads/leadPresentation';
import type { Lead, Page } from '../src/api/types';

const lead = (id: string): Lead => ({ lead_id: id, company_name: `Store ${id}`, contact_person: 'Contact', status: 'new' });
const page = (items: Lead[], number = 1, totalPages = 2): Page<Lead> => ({ items, page: number, total: 4, totalPages });

test('infinite list loads sequentially, deduplicates records and stops at the last page', async () => {
  const requested: number[] = [];
  const pager = createPagedList(async next => { requested.push(next); return page(next === 1 ? [lead('1'), lead('2')] : [lead('2'), lead('3')], next); }, item => item.lead_id, () => {});
  await pager.reset(); await Promise.all([pager.more(), pager.more()]); await pager.more();
  assert.deepEqual(requested, [1, 2]); assert.equal(pager.getState().hasMore, false);
  assert.deepEqual(pager.getState().items.map(item => item.lead_id), ['1', '2', '3']);
});

test('refresh ignores stale requests and load-more failures retain records for retry', async () => {
  let release!: (value: Page<Lead>) => void, call = 0;
  const pager = createPagedList<Lead>(async next => {
    call++;
    if (call === 1) return new Promise(resolve => { release = resolve; });
    if (call === 3) throw new Error('offline');
    return page([lead(String(call))], next);
  }, item => item.lead_id, () => {});
  const stale = pager.reset(); await pager.reset(); release(page([lead('stale')])); await stale;
  assert.equal(pager.getState().items[0].lead_id, '2');
  await pager.more(); assert.equal(pager.getState().error, 'offline'); assert.equal(pager.getState().page, 1);
  await pager.more(); assert.equal(pager.getState().page, 2); assert.equal(pager.getState().items.length, 2);
});

test('cancelled lists cannot publish results after account change/unmount', async () => {
  let release!: (value: Page<Lead>) => void, updates = 0;
  const pager = createPagedList<Lead>(() => new Promise(resolve => { release = resolve; }), item => item.lead_id, () => { updates++; });
  const pending = pager.reset(); const before = updates; pager.cancel(); release(page([lead('private')])); await pending;
  assert.equal(updates, before); assert.equal(pager.getState().items.length, 0);
});

test('filter parameters are allowlisted and dates are validated before submitting', () => {
  const filters = { ...emptyLeadFilters, priority: 'high', team_id: 'team', product_id: 'product', company_id: 'other-company' };
  const params = filterParams(filters);
  assert.equal(params.get('team_id'), 'team'); assert.equal(params.has('company_id'), false);
  assert.throws(() => validateFilters({ ...filters, from_date: '2026-02-30' }), /valid date/);
  assert.throws(() => validateFilters({ ...filters, from_date: '2026-10-10', to_date: '2026-10-01' }), /after/);
  assert.doesNotThrow(() => validateFilters({ ...filters, from_date: '2026-10-01', to_date: '2026-10-10' }));
});

test('CSV includes only selected allowlisted fields, protects formulas, quotes commas and keeps zero', () => {
  const row = { ...lead('1'), company_name: '  दुकान, "One"\nName  ', phone: '00123456789', email: '=EVIL()', estimated_value: 0, token: 'never-export' };
  const csv = leadsCsv([row], ['company_name', 'phone', 'email', 'estimated_value', 'token']);
  assert.ok(csv.startsWith('\uFEFF')); assert.match(csv, /दुकान, ""One"" Name/);
  assert.match(csv, /'00123456789/); assert.match(csv, /'=EVIL\(\)/); assert.match(csv, /"0"/);
  assert.doesNotMatch(csv, /never-export|Contact person|Status/);
  assert.equal(csvCell('\t+SUM(1,2)'), '"\'+SUM(1,2)"');
  assert.throws(() => leadsCsv([row], []), /at least one/);
  assert.equal(hasValue(0), true); assert.equal(hasValue('  '), false); assert.equal(hasValue(null), false);
  assert.ok(leadFields.every(field => field.key !== ('token' as any)));
});

test('export loads every filtered page, deduplicates and never silently truncates', async () => {
  const calls: number[] = [];
  const rows = await collectExport(async next => { calls.push(next); return page(next === 1 ? [lead('1')] : [lead('1'), lead('2')], next); }, () => false, () => {});
  assert.deepEqual(calls, [1, 2]); assert.equal(rows.length, 2);
  await assert.rejects(collectExport(async () => ({ ...page([]), total: 6000 }), () => false, () => {}), /5000/);
  let cancelled = false;
  await assert.rejects(collectExport(async () => { cancelled = true; return page([lead('1')]); }, () => cancelled, () => {}), /cancelled/);
  await assert.rejects(collectExport(async () => { throw new Error('403'); }, () => false, () => {}), /403/);
});
