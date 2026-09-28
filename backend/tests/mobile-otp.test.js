const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createMobileOtpService } = require('../services/mobileOtpService');

function fixture() {
  const jobs = [], mail = [], rows = new Map(), notices = [];
  const state = { user: { user_id: 'UI1', company_id: 'CI1', name: 'Sales', email: 'sales@example.test', role: 'sales', is_active: 1 }, limited: false, failedMail: false, smtp: true };
  const env = { CRM_MOBILE_EMAIL_OTP_ENABLED: 'true', CRM_MOBILE_OTP_SECRET: 'a'.repeat(64), AUTH_SECRET: 'b'.repeat(64) };
  const repository = {
    reserve: async data => {
      if (state.limited) return null;
      for (const row of rows.values()) if (row.emailKey === data.emailKey) row.used = true;
      rows.set(data.challengeId, { ...data, attempts: 0, used: false });
      return { user: state.user };
    },
    consume: async data => {
      const row = rows.get(data.challengeId);
      if (!row || row.used || row.emailKey !== data.emailKey || row.attempts >= 5) return null;
      if (!data.matches(row.codeHash)) { row.attempts++; return null; }
      row.used = true;
      return state.user ? { user: state.user, company: { company_id: 'CI1', name: 'Company', smtp_pass: 'must-not-leak' } } : null;
    },
    invalidate: async id => { rows.get(id).used = true; }, cleanup: async () => {},
  };
  const service = createMobileOtpService({ repository, env,
    mailer: { hasPlatformSmtpTransport: () => state.smtp, sendCustomEmail: async data => { mail.push(data); return { delivery: state.failedMail ? 'preview' : 'email' }; } },
    companyRepository: { getCompanyWithSettings: async () => ({ name: 'Platform' }) }, platformCompanyId: 'platform',
    buildAuthToken: () => 'test-token', schedule: job => jobs.push(job), warn: message => notices.push(message),
  });
  const flush = async () => { while (jobs.length) jobs.shift()(); await new Promise(resolve => setImmediate(resolve)); };
  const request = () => service.request({ email: ' SALES@example.test ' }, '127.0.0.1');
  const verify = (challenge, code) => service.verify({ email: 'sales@example.test', challenge_id: challenge.challenge_id, code });
  const code = () => mail.at(-1).body.match(/code is (\d{6})/)[1];
  return { service, state, env, mail, rows, notices, flush, request, verify, code };
}

test('OTP response never exposes code; email delivery and single-use login return only a minimal sales profile', async () => {
  const f = fixture(), challenge = await f.request();
  assert.equal(f.mail.length, 0); assert.deepEqual(Object.keys(challenge).sort(), ['challenge_id', 'expires_in', 'message', 'retry_after']);
  await f.flush();
  assert.match(f.code(), /^\d{6}$/);
  assert.equal(f.mail[0].to, 'sales@example.test');
  assert.equal(f.mail[0].redactErrors, true);
  const row = f.rows.get(challenge.challenge_id);
  assert.equal(row.codeHash.length, 64); assert.notEqual(row.codeHash, f.code());
  assert.equal(row.emailKey.includes('@'), false);
  const data = await f.verify(challenge, f.code());
  assert.equal(data.user.role, 'sales'); assert.equal(data.token, 'test-token');
  assert.equal('is_active' in data.user, false); assert.equal('smtp_pass' in data.company, false);
  await assert.rejects(f.verify(challenge, f.code()), { statusCode: 401 });
});

test('unknown accounts get the same response shape but no email or login', async () => {
  const f = fixture(); f.state.user = null;
  const response = await f.request(); await f.flush();
  assert.equal(response.expires_in, 300); assert.equal(response.retry_after, 60); assert.equal(f.mail.length, 0);
  await assert.rejects(f.verify(response, '123456'), { statusCode: 401 });
});

test('codes are bound to email and challenge, and a resend invalidates the previous code', async () => {
  const f = fixture(), old = await f.request(); await f.flush(); const oldCode = f.code();
  await assert.rejects(f.service.verify({ email: 'another@example.test', challenge_id: old.challenge_id, code: oldCode }), { statusCode: 401 });
  const next = await f.request(); await f.flush();
  await assert.rejects(f.verify(old, oldCode), { statusCode: 401 });
  assert.equal((await f.verify(next, f.code())).token, 'test-token');
});

test('five incorrect codes exhaust a challenge', async () => {
  const f = fixture(), challenge = await f.request(); await f.flush();
  const wrong = f.code() === '000000' ? '000001' : '000000';
  for (let i = 0; i < 5; i++) await assert.rejects(f.verify(challenge, wrong), { statusCode: 401 });
  await assert.rejects(f.verify(challenge, f.code()), { statusCode: 401 });
});

test('changed roles and inactive users cannot receive a login token', async () => {
  for (const change of [{ role: 'manager' }, { is_active: 0 }]) {
    const f = fixture(), challenge = await f.request(); await f.flush(); Object.assign(f.state.user, change);
    await assert.rejects(f.verify(challenge, f.code()), { statusCode: 401 });
  }
});

test('disabled, missing SMTP and weak-secret configurations fail closed', async () => {
  for (const configure of [f => { f.env.CRM_MOBILE_EMAIL_OTP_ENABLED = 'false'; }, f => { f.env.CRM_MOBILE_OTP_SECRET = ''; },
    f => { f.env.AUTH_SECRET = 'replace-this-in-production'; }, f => { f.state.smtp = false; }]) {
    const f = fixture(); configure(f);
    await assert.rejects(f.request(), { statusCode: 503 }); assert.equal(f.rows.size, 0);
  }
});

test('rate limiting and malformed inputs never schedule emails', async () => {
  const f = fixture(); f.state.limited = true;
  await assert.rejects(f.request(), { statusCode: 429 });
  await assert.rejects(f.service.request({ email: 'x@example.test\r\nBcc: y@test.com' }, 'ip'), { statusCode: 400 });
  await assert.rejects(f.service.verify({ email: 'sales@example.test', challenge_id: "'; DROP TABLE users;--", code: '123456' }), { statusCode: 401 });
  await f.flush(); assert.equal(f.mail.length, 0);
});

test('SMTP failure has no preview fallback, invalidates the challenge and logs no secrets', async () => {
  const f = fixture(); f.state.failedMail = true;
  const challenge = await f.request(); await f.flush();
  await assert.rejects(f.verify(challenge, f.code()), { statusCode: 401 });
  assert.ok(f.notices.length); assert.ok(f.notices.every(message => !message.includes(f.code()) && !message.includes('sales@example')));
});
