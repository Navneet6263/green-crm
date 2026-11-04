const { test } = require('node:test');
const assert = require('node:assert/strict');

// A small in-memory stand-in for the login code table, set up before the services capture the query function.
const db = require('../db/connection');
const codes = new Map();
const verified = [];
db.query = async (sql, params = []) => {
  if (/SELECT COUNT\(\*\) AS total FROM login_email_otps/.test(sql)) return [[{ total: 0 }]];
  if (/INSERT INTO login_email_otps/.test(sql)) { codes.set(params[0], { challenge_id: params[0], user_id: params[1], code_hash: params[2], attempts: 0, expired: 0, used: false }); return [[]]; }
  if (/DELETE FROM login_email_otps/.test(sql)) { codes.delete(params[0]); return [[]]; }
  if (/FROM login_email_otps WHERE challenge_id = \? AND used_at IS NULL/.test(sql)) { const row = codes.get(params[0]); return [row && !row.used ? [{ ...row }] : []]; }
  if (/SET attempts = attempts \+ 1/.test(sql)) { codes.get(params[0]).attempts += 1; return [[]]; }
  if (/SET used_at = SYSUTCDATETIME\(\)/.test(sql)) { codes.get(params[0]).used = true; return [[]]; }
  if (/UPDATE users SET email_verified_at/.test(sql)) { verified.push(params[0]); return [[]]; }
  return [[]];
};

const { hashPassword } = require('../utils/auth');
const userRepository = require('../repositories/userRepository');
const companyRepository = require('../repositories/companyRepository');
const emailService = require('../services/emailService');
const loginOtp = require('../services/auth/loginOtp');
const authService = require('../services/authService');

let user;
const logins = [];
userRepository.getUserByEmail = async () => user;
userRepository.getUserById = async () => user;
userRepository.updateLastLogin = async (id) => { logins.push(id); };
companyRepository.getCompanyWithSettings = async () => ({ company_id: 'C1', name: 'Green Call' });
const mails = [];
let delivery = 'email';
emailService.sendEmail = async (payload) => { mails.push(payload); return { delivery }; };

async function freshUser(extra = {}) {
  user = { user_id: 'U1', company_id: 'C1', name: 'Rahul Sharma', email: 'rahul@greencall.in', role: 'sales', is_active: 1, password: await hashPassword('Secret#123'), email_verified_at: null, ...extra };
}

test('the monthly check: needed when never verified or older than 30 days, and can be switched off', () => {
  const now = Date.parse('2026-11-04T10:00:00Z');
  assert.equal(loginOtp.needsCheck({ email_verified_at: null }, now), true);
  assert.equal(loginOtp.needsCheck({ email_verified_at: '2026-10-20T10:00:00Z' }, now), false);
  assert.equal(loginOtp.needsCheck({ email_verified_at: '2026-09-30T10:00:00Z' }, now), true);
  assert.equal(loginOtp.needsCheck({ email_verified_at: null }, now, { LOGIN_EMAIL_OTP: 'off' }), false);
  assert.equal(loginOtp.emailHint('navneet@gmail.com'), 'na*****@gmail.com');
});

test('web login asks for the emailed code, a wrong code is refused, the right one signs in and proves the email', async () => {
  await freshUser();
  const first = await authService.login({ email: 'rahul@greencall.in', password: 'Secret#123', email_otp: true });
  assert.equal(first.otp_required, true);
  assert.equal(first.token, undefined);
  assert.equal(first.email_hint, 'ra***@greencall.in');
  assert.equal(logins.length, 0, 'not signed in yet');
  const code = /(\d{6}) is your GreenCRM sign-in code/.exec(mails.at(-1).subject)[1];
  assert.match(mails.at(-1).html, /cid:greencrm-logo/);

  const wrong = code === '000000' ? '111111' : '000000';
  await assert.rejects(authService.verifyLoginCode({ challenge_id: first.challenge_id, code: wrong }), /not right\. 4 tries left/);
  const done = await authService.verifyLoginCode({ challenge_id: first.challenge_id, code });
  assert.ok(done.token);
  assert.deepEqual(verified, ['U1']);
  assert.deepEqual(logins, ['U1']);
  await assert.rejects(authService.verifyLoginCode({ challenge_id: first.challenge_id, code }), /expired/, 'a code works once');
});

test('no code when: the mobile app signs in, the email was proven this month, or the CRM cannot send email', async () => {
  await freshUser();
  assert.ok((await authService.login({ email: 'rahul@greencall.in', password: 'Secret#123' })).token, 'old clients send no flag');

  await freshUser({ email_verified_at: new Date(Date.now() - 5 * 86400000) });
  assert.ok((await authService.login({ email: 'rahul@greencall.in', password: 'Secret#123', email_otp: true })).token);

  await freshUser();
  delivery = 'preview';
  const result = await authService.login({ email: 'rahul@greencall.in', password: 'Secret#123', email_otp: true });
  delivery = 'email';
  assert.ok(result.token, 'a mail outage does not lock anyone out');
  assert.equal(codes.size >= 1, true);
});

test('a wrong password never sends a code', async () => {
  await freshUser();
  const before = mails.length;
  await assert.rejects(authService.login({ email: 'rahul@greencall.in', password: 'nope', email_otp: true }), /Invalid credentials/);
  assert.equal(mails.length, before);
});
