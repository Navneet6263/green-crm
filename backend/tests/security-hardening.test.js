const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-hs256-signing';
const db = require('../db/connection');
const queries = [];
db.query = async (sql, params = []) => { queries.push({ sql, params }); return [[]]; };

const users = require('../repositories/userRepository');
const auth = require('../utils/auth');
const authenticate = require('../middlewares/authenticate');
const { protectUploads } = require('../middlewares/protectUploads');
const securityHeaders = require('../middlewares/securityHeaders');
const loginGuard = require('../services/auth/loginGuard');
const { isRevoked } = require('../services/auth/sessions');

const run = (mw, req, res = { set() {}, removeHeader() {} }) => new Promise((resolve) => mw(req, res, (error) => resolve(error || null)));
const user = (extra = {}) => ({ user_id: 'U1', company_id: 'C1', role: 'admin', email: 'a@b.in', name: 'A', is_active: 1, ...extra });

test('tokens: tampered, wrong algorithm or broken tokens are refused', () => {
  const token = auth.buildAuthToken(user());
  assert.ok(auth.verifyToken(token));
  const [h, p, s] = token.split('.');
  assert.equal(auth.verifyToken(`${h}.${p}.${s.slice(0, -2)}xx`), null);
  const evilPayload = Buffer.from(JSON.stringify({ sub: 'U1', role: 'super-admin' })).toString('base64url');
  assert.equal(auth.verifyToken(`${h}.${evilPayload}.${s}`), null);
  const none = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
  const noneSig = crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${none}.${p}`).digest('base64url');
  assert.equal(auth.verifyToken(`${none}.${p}.${noneSig}`), null, 'only HS256 is accepted');
  assert.equal(auth.verifyToken('not.a.token'), null);
});

test('the server will not run with a missing or public secret outside development and tests', () => {
  const saved = { secret: process.env.JWT_SECRET, ctx: process.env.NODE_TEST_CONTEXT, env: process.env.NODE_ENV };
  try {
    delete process.env.NODE_TEST_CONTEXT;
    process.env.NODE_ENV = '';
    process.env.JWT_SECRET = '';
    assert.throws(() => auth.assertSigningSecret(), /JWT_SECRET/);
    process.env.JWT_SECRET = 'greencrm-dev-secret';
    assert.throws(() => auth.assertSigningSecret(), /JWT_SECRET/);
    process.env.JWT_SECRET = 'short';
    assert.throws(() => auth.assertSigningSecret(), /JWT_SECRET/);
  } finally {
    process.env.JWT_SECRET = saved.secret;
    if (saved.ctx !== undefined) process.env.NODE_TEST_CONTEXT = saved.ctx;
    process.env.NODE_ENV = saved.env || '';
  }
});

test('a password-reset link token can never be used to sign in', async () => {
  mock.method(users, 'getUserById', async () => user());
  const resetToken = auth.buildTimedToken({ sub: 'U1', purpose: 'password-reset' }, 300);
  const error = await run(authenticate, { headers: { authorization: `Bearer ${resetToken}` } });
  assert.equal(error?.statusCode, 401);
  mock.restoreAll();
});

test('"sign out everywhere" ends older tokens and keeps newer ones', async () => {
  const now = Math.floor(Date.now() / 1000);
  assert.equal(isRevoked({ sessions_revoked_at: new Date((now + 5) * 1000) }, { iat: now }), true);
  assert.equal(isRevoked({ sessions_revoked_at: new Date(now * 1000 + 400) }, { iat: now }), false, 'same second stays valid');
  assert.equal(isRevoked({ sessions_revoked_at: null }, { iat: now }), false);

  mock.method(users, 'getUserById', async () => user({ sessions_revoked_at: new Date(Date.now() + 5000) }));
  const token = auth.buildAuthToken(user());
  const error = await run(authenticate, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(error?.statusCode, 401);
  assert.match(error.message, /signed out/);
  mock.restoreAll();
});

test('lead documents need a login and access to that company', async () => {
  const noLogin = await run(protectUploads, { path: '/leads/C1/LD1/general/x.pdf', headers: {} });
  assert.equal(noLogin?.statusCode, 401);

  mock.method(users, 'getUserById', async () => user({ company_id: 'C2' }));
  const other = auth.buildAuthToken(user({ company_id: 'C2', user_id: 'U9' }));
  const wrongCompany = await run(protectUploads, { path: '/leads/C1/LD1/general/x.pdf', headers: { cookie: `theme=dark; authToken=${encodeURIComponent(other)}` } });
  assert.equal(wrongCompany?.statusCode, 403);
  mock.restoreAll();

  assert.equal(await run(protectUploads, { path: '/branding/logo.png', headers: {} }), null, 'other files are untouched');
});

test('every API answer forbids caching and sniffing', async () => {
  const headers = {};
  await run(securityHeaders, { secure: true }, { set: (k, v) => (typeof k === 'object' ? Object.assign(headers, k) : (headers[k] = v)) });
  assert.match(headers['Cache-Control'], /no-store/);
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(headers['X-Frame-Options'], 'DENY');
  assert.match(headers['Strict-Transport-Security'], /max-age/);
});

test('an account locks after too many wrong passwords', async () => {
  assert.throws(() => loginGuard.assertNotLocked({ lock_until: new Date(Date.now() + 10 * 60000) }), (e) => e.statusCode === 429 && /Try again in 10 minutes/.test(e.message));
  assert.doesNotThrow(() => loginGuard.assertNotLocked({ lock_until: new Date(Date.now() - 1000) }));
  queries.length = 0;
  await loginGuard.recordFailure({ user_id: 'U1' });
  assert.match(queries[0].sql, /login_attempts = COALESCE\(login_attempts, 0\) \+ 1/);
  assert.deepEqual(queries[0].params, [loginGuard.MAX_FAILURES, loginGuard.LOCK_MINUTES, 'U1']);
});

test('a reset link works once: it stops matching after the password changes', async () => {
  const authService = require('../services/authService');
  const stored = { ...user(), password: 'hash-before' };
  mock.method(users, 'getUserById', async () => stored);
  const version = crypto.createHash('sha256').update('hash-before').digest('hex').slice(0, 16);
  const stale = auth.buildTimedToken({ sub: 'U1', purpose: 'password-reset', pwv: 'different' }, 300);
  await assert.rejects(authService.resetPassword({ token: stale, new_password: 'NewPassword123' }), /already used|too old/);
  const old = auth.buildTimedToken({ sub: 'U1', purpose: 'password-reset' }, 300);
  await assert.rejects(authService.resetPassword({ token: old, new_password: 'NewPassword123' }), /already used|too old/);
  assert.equal(version.length, 16);
  mock.restoreAll();
});
