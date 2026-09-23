import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, createApiClient, readPage, unwrap, validateBaseUrl } from '../src/api/client';
import { telephoneUrl } from '../src/ui/format';

const base = 'https://crm.example.test/api';
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

test('requires an explicit API address; HTTPS production and local development only', () => {
  assert.equal(validateBaseUrl(`${base}/`, false), base);
  assert.equal(validateBaseUrl('http://10.0.2.2:5000/api', true), 'http://10.0.2.2:5000/api');
  assert.equal(validateBaseUrl('http://192.168.1.10:5000/api', true), 'http://192.168.1.10:5000/api');
  for (const url of ['', 'bad url', 'http://crm.example.test/api', 'https://user:pass@crm.example.test/api', `${base}?token=secret`, `${base}#fragment`, 'https://crm.example.test']) {
    assert.throws(() => validateBaseUrl(url, false), ApiError);
  }
  assert.throws(() => validateBaseUrl('http://10.0.2.2:5000/api', false));
});

test('GET uses Bearer auth and POST sends JSON without adding company or role claims', async () => {
  const requests: { url: string; options?: RequestInit }[] = [];
  const client = createApiClient(base, { fetcher: async (url, options) => {
    requests.push({ url: String(url), options }); return json({ success: true, data: { ok: true } });
  } });
  await client('/leads', 'test-token');
  await client('/auth/login', '', { email: 'sales@example.test', password: 'test-only' });
  assert.equal(requests[0].options?.method, 'GET');
  assert.equal((requests[0].options?.headers as Record<string, string>).Authorization, 'Bearer test-token');
  assert.equal(requests[0].options?.body, undefined);
  assert.equal(requests[1].options?.method, 'POST');
  assert.equal((requests[1].options?.headers as Record<string, string>).Authorization, undefined);
  assert.deepEqual(JSON.parse(String(requests[1].options?.body)), { email: 'sales@example.test', password: 'test-only' });
});

test('401 expires the matching authenticated token, but login errors do not expire other sessions', async () => {
  const expired: string[] = [];
  const client = createApiClient(base, { onUnauthorized: token => expired.push(token), fetcher: async () => json({ error: 'Expired' }, 401) });
  await assert.rejects(client('/leads', 'old-token'), (error: unknown) => error instanceof ApiError && error.status === 401);
  await assert.rejects(client('/auth/login', '', {}));
  assert.deepEqual(expired, ['old-token']);
});

test('403 is shown without automatically clearing the login', async () => {
  let expired = false;
  const client = createApiClient(base, { onUnauthorized: () => { expired = true; }, fetcher: async () => json({ success: false, error: 'Outside your team' }, 403) });
  await assert.rejects(client('/leads/other', 'token'), /Outside your team/);
  assert.equal(expired, false);
});

test('non-JSON server error and invalid success body never turn into empty successful data', async () => {
  const client = createApiClient(base, { fetcher: async () => new Response('<html>bad gateway</html>', { status: 502 }) });
  await assert.rejects(client('/leads'), /502/);
  const malformed = createApiClient(base, { fetcher: async () => new Response('not json') });
  await assert.rejects(malformed('/leads'), /unexpected response/);
});

test('timeout is visible and writes are never retried automatically', async () => {
  let attempts = 0;
  const client = createApiClient(base, { timeoutMs: 10, fetcher: async (_url, options) => {
    attempts++;
    return new Promise<Response>((_resolve, reject) => options?.signal?.addEventListener('abort', () => reject(new Error('AbortError'))));
  } });
  await assert.rejects(client('/leads/id/notes', 'token', { content: 'Hello' }), /too long/);
  assert.equal(attempts, 1);
});

test('network failure is distinct from an empty list', async () => {
  const client = createApiClient(base, { fetcher: async () => { throw new Error('Network failed'); } });
  await assert.rejects(client('/leads'), /Cannot reach/);
});

test('list pagination supports CRM wrapped and legacy item responses', () => {
  assert.deepEqual(readPage({ data: [{ lead_id: '1' }], meta: { total: 50, total_pages: 4 } }, 2), { items: [{ lead_id: '1' }], total: 50, totalPages: 4, page: 2 });
  assert.equal(readPage({ items: [], pagination: { total: 0, totalPages: 1 } }, 1).total, 0);
  assert.throws(() => readPage({ error: 'bad' }, 1), /unexpected list/);
  assert.deepEqual(unwrap({ data: { lead_id: '1' } }), { lead_id: '1' });
});

test('rejects off-site or protocol-relative API paths', async () => {
  const client = createApiClient(base, { fetcher: async () => { throw new Error('Must not fetch'); } });
  for (const path of ['https://other.test', '//other.test']) await assert.rejects(client(path, 'token'), /Invalid API path/);
});

test('only safe telephone links are produced', () => {
  assert.equal(telephoneUrl('+91 98765 43210'), 'tel:+919876543210');
  for (const value of [undefined, '', '123', '+123+4567', '*123#']) assert.equal(telephoneUrl(value), null);
});
