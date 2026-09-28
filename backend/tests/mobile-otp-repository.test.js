const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { resolve } = require('node:path');

function fixture() {
  const state = { row: { code_hash: 'hash', valid_time: 1, attempts: 0, user_id: 'UI1', company_id: 'CI1' },
    users: [{ user_id: 'UI1', company_id: 'CI1', role: 'sales', is_active: 1 }], limit: null, commits: 0, rollbacks: 0 };
  const calls = [], locks = [];
  const tx = { query: async (sql, params = []) => {
    calls.push({ sql, params });
    assert.equal((sql.match(/\?/g) || []).length, params.length, 'SQL parameter count');
    if (sql.includes('FROM dbo.mobile_login_otp_limits')) return [state.limit ? [state.limit] : []];
    if (sql.includes('FROM dbo.mobile_login_otps WITH')) return [state.row ? [state.row] : []];
    if (sql.includes('FROM users')) return [state.users];
    if (sql.includes('FROM companies')) return [[{ company_id: 'CI1', name: 'Company' }]];
    if (sql.includes('attempts = attempts + 1')) state.row.attempts++;
    if (sql.includes('consumed_at = SYSUTCDATETIME()') && state.row) state.row.consumed_at = new Date();
    return [{ affectedRows: 1 }];
  } };
  let queue = Promise.resolve();
  const db = { query: tx.query, withTransaction: handler => {
    // Fake database serializes transactions; query assertions below check production locking.
    const next = queue.then(async () => { try { const result = await handler(tx); state.commits++; return result; } catch (error) { state.rollbacks++; throw error; } });
    queue = next.catch(() => {}); return next;
  } };
  const module = { exports: {} };
  runInNewContext(readFileSync(resolve(__dirname, '../repositories/mobileOtpRepository.js'), 'utf8'), { module, require: name => {
    if (name === '../db/connection') return db;
    if (name === './transactionLock') return async (_tx, resource) => locks.push(resource);
    throw new Error(`Unexpected import ${name}`);
  } });
  const input = { email: 'sales@example.test', emailKey: 'e'.repeat(64), ipKey: 'i'.repeat(64), challengeId: 'test-id', codeHash: 'hash', matches: hash => hash === 'hash' };
  return { repo: module.exports, state, calls, locks, input };
}

test('SQL reservation persists IP/email throttles, five-minute expiry and invalidates older codes', async () => {
  const f = fixture(); const result = await f.repo.reserve(f.input);
  assert.equal(result.user.user_id, 'UI1'); assert.equal(f.locks.length, 2);
  assert.equal(f.calls.filter(call => call.sql.includes('INSERT INTO dbo.mobile_login_otp_limits')).length, 2);
  assert.ok(f.calls.some(call => call.sql.includes('DATEADD(MINUTE, 5, SYSUTCDATETIME())')));
  assert.ok(f.calls.some(call => call.sql.includes('WHERE email_key = ? AND consumed_at IS NULL')));
  assert.equal(f.state.commits, 1);
});

test('SQL limits reject cooldown and exhausted windows without inserting challenges', async () => {
  for (const limit of [{ request_count: 1, window_age: 80, last_age: 10 }, { request_count: 5, window_age: 800, last_age: 90 }]) {
    const f = fixture(); f.state.limit = limit;
    assert.equal(await f.repo.reserve(f.input), null);
    assert.ok(f.calls.every(call => !call.sql.startsWith('INSERT')));
  }
});

test('ambiguous, inactive and non-sales accounts have no eligible user', async () => {
  for (const users of [[], [{ role: 'manager', is_active: 1 }], [{ role: 'sales', is_active: 0 }], [{ role: 'sales', is_active: 1 }, { role: 'sales', is_active: 1 }]]) {
    const f = fixture(); f.state.users = users;
    assert.equal((await f.repo.reserve(f.input)).user, null);
  }
});

test('SQL wrong-code attempts commit and lock out at five', async () => {
  const f = fixture();
  for (let attempt = 0; attempt < 5; attempt++) assert.equal(await f.repo.consume({ ...f.input, matches: () => false }), null);
  assert.equal(f.state.row.attempts, 5); assert.equal(f.state.commits, 5); assert.equal(f.state.rollbacks, 0);
  assert.equal(await f.repo.consume(f.input), null);
  assert.ok(f.calls.some(call => call.sql.includes('UPDLOCK, ROWLOCK')));
});

test('expired, consumed and mismatched-tenant challenges cannot authenticate', async () => {
  for (const patch of [{ valid_time: 0 }, { consumed_at: new Date() }, { company_id: 'OTHER' }, { user_id: 'OTHER' }]) {
    const f = fixture(); Object.assign(f.state.row, patch);
    assert.equal(await f.repo.consume(f.input), null);
  }
});

test('consume serializes replay attempts and uses the same application lock as request', async () => {
  const f = fixture();
  const results = await Promise.all([f.repo.consume(f.input), f.repo.consume(f.input)]);
  assert.equal(results.filter(Boolean).length, 1); assert.equal(f.locks[0], `mobile-otp:${f.input.emailKey}`);
  assert.ok(f.calls.some(call => call.sql.includes('last_login_at')));
});
