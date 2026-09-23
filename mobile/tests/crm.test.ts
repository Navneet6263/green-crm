import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import type { Session } from '../src/api/types';

const originalFetch = globalThis.fetch;
const originalBase = process.env.EXPO_PUBLIC_API_URL;
process.env.EXPO_PUBLIC_API_URL = 'https://crm.example.test/api';
Object.assign(globalThis, { __DEV__: false });
let crm: typeof import('../src/api/crm');
let sales: typeof import('../src/api/sales');
before(async () => { crm = await import('../src/api/crm'); sales = await import('../src/api/sales'); });
after(() => { globalThis.fetch = originalFetch; if (originalBase === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = originalBase; });
const live: Session = { user: { user_id: 'test-sales', company_id: 'test-company', name: 'Test Sales', email: 'test@example.test', role: 'sales' }, token: 'test-session-token' };

test('sales lead list uses the assigned/shared endpoint, not creator-only my-leads', async () => {
  let requested = '';
  globalThis.fetch = async url => { requested = String(url); return new Response(JSON.stringify({ data: [], meta: { total: 0, total_pages: 1 } })); };
  await crm.getLeads(live, 'store & shop', 2);
  const url = new URL(requested);
  assert.equal(url.pathname, '/api/leads');
  assert.equal(url.searchParams.get('search'), 'store & shop');
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(url.searchParams.has('company_id'), false);
});

test('tasks are personal and unfinished, and lead details use core view', async () => {
  const calls: URL[] = [];
  globalThis.fetch = async url => { calls.push(new URL(String(url))); return new Response(JSON.stringify(String(url).includes('view=core') ? { data: { lead_id: 'lead/1' } } : { data: [], meta: { total: 0, total_pages: 1 } })); };
  await crm.getTasks(live, 'overdue', 3);
  await crm.getLead(live, 'lead/1');
  assert.equal(calls[0].searchParams.get('mine'), '1');
  assert.equal(calls[0].searchParams.get('open_only'), '1');
  assert.equal(calls[0].searchParams.get('due_bucket'), 'overdue');
  assert.equal(calls[1].pathname, '/api/leads/lead%2F1');
  assert.equal(calls[1].searchParams.get('view'), 'core');
});

test('note writes reject blanks and send only trimmed content', async () => {
  let body: unknown;
  let calls = 0;
  globalThis.fetch = async (_url, options) => { calls++; body = JSON.parse(String(options?.body)); return new Response(JSON.stringify({ success: true, data: { created: true } })); };
  await assert.rejects(crm.addNote(live, 'lead1', '   '), /Write a note/);
  assert.equal(calls, 0);
  await crm.addNote(live, 'lead1', '  Discussed needs  ');
  assert.deepEqual(body, { content: 'Discussed needs' });
  assert.equal(calls, 1);
});

test('lead creation sends only allowed sales fields and defaults ownership on the server', async () => {
  let request: { url?: string; method?: string; body?: Record<string, unknown> } = {};
  globalThis.fetch = async (url, options) => {
    request = { url: String(url), method: options?.method, body: JSON.parse(String(options?.body)) };
    return new Response(JSON.stringify({ data: { lead_id: 'created-lead' } }));
  };
  const input = { company_name: ' Store ', contact_person: ' Person ', phone: '+91 9876543210', email: '', product_id: 'product', team_id: 'team',
    address_street: '', address_city: ' Delhi ', requirements: ' Need service ', priority: 'medium', follow_up_date: null,
    assigned_to: 'other-user', company_id: 'other-company', estimated_value: '80000', advance_received: '50000' };
  assert.equal((await sales.createLead(live, input)).lead_id, 'created-lead');
  assert.equal(request.method, 'POST');
  assert.equal(request.body?.company_name, 'Store');
  for (const field of ['assigned_to', 'company_id', 'shared_user_ids']) assert.equal(field in request.body!, false);
  assert.equal(request.body?.advance_received, 50000);
  assert.equal(request.body?.team_id, 'team');
  await assert.rejects(sales.createLead(live, { ...input, product_id: '' }), /Choose a product/);
  await assert.rejects(sales.createLead(live, { ...input, phone: '', email: '' }), /phone number or email/);
});

test('follow-up PATCH cannot send ownership or money fields', async () => {
  let method: string | undefined, body: unknown;
  globalThis.fetch = async (_url, options) => { method = options?.method; body = JSON.parse(String(options?.body)); return new Response(JSON.stringify({ success: true })); };
  const changes = { status: 'contacted', priority: 'high', follow_up_date: '2026-10-01T04:30:00.000Z', company_id: 'other', assigned_to: 'other' };
  await sales.updateFollowUp(live, 'lead1', changes);
  assert.equal(method, 'PATCH');
  assert.deepEqual(body, { status: 'contacted', priority: 'high', follow_up_date: changes.follow_up_date });
  await assert.rejects(sales.updateFollowUp(live, 'lead1', { ...changes, status: 'fake-status' }), /valid lead status/);
  await assert.rejects(sales.updateFollowUp(live, 'lead1', { ...changes, follow_up_date: 'invalid' }), /valid follow-up/);
});

test('task actions use done/pending and new tasks cannot assign someone else', async () => {
  const calls: { method?: string; body: Record<string, unknown> }[] = [];
  globalThis.fetch = async (_url, options) => { calls.push({ method: options?.method, body: JSON.parse(String(options?.body)) }); return new Response(JSON.stringify({ data: { task_id: 'new-task' } })); };
  await sales.completeTask(live, 'task1', true);
  await sales.completeTask(live, 'task1', false);
  await sales.createTask(live, { title: ' Call ', due_date: '2026-10-01T04:30:00.000Z', notes: '', priority: 'high', team_id: 'my-team' });
  assert.deepEqual(calls[0], { method: 'PATCH', body: { status: 'done' } });
  assert.deepEqual(calls[1], { method: 'PATCH', body: { status: 'pending' } });
  assert.equal(calls[2].body.title, 'Call');
  assert.equal('assigned_to' in calls[2].body, false);
  await assert.rejects(sales.createTask(live, { title: '', due_date: '', notes: '', priority: 'high', team_id: '' }), /task title/);
});

test('products are fetched for the selected team; done tasks are not filtered as open', async () => {
  const urls: URL[] = [];
  globalThis.fetch = async url => { urls.push(new URL(String(url))); return new Response(JSON.stringify({ data: [], meta: { total: 0, total_pages: 1 } })); };
  await crm.getProducts(live, 'team 2', 'Green', 2);
  await crm.getTasks(live, 'all', 1, true);
  assert.equal(urls[0].searchParams.get('team_id'), 'team 2');
  assert.equal(urls[0].searchParams.get('page'), '2');
  assert.equal(urls[1].searchParams.get('status'), 'done');
  assert.equal(urls[1].searchParams.has('open_only'), false);
  assert.equal(urls[1].searchParams.get('mine'), '1');
});

test('malformed lead details and ambiguous create responses are not reported as successful saves', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ data: {} }));
  await assert.rejects(crm.getLead(live, 'id'), /incomplete lead details/);
  await assert.rejects(sales.createTask(live, { title: 'Call', due_date: '2026-10-01T04:30:00.000Z', notes: '', priority: 'medium', team_id: 'team' }), /Check My Tasks/);
});
