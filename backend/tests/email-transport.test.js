const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const nodemailer = require('nodemailer');

const created = [];
nodemailer.createTransport = (options) => {
  created.push(options);
  return { sendMail: async (mail) => ({ messageId: 'id-1', mail }) };
};
const emailService = require('../services/emailService');

const KEYS = ['HOST', 'PORT', 'USER', 'PASS', 'FROM', 'SECURE'].flatMap((k) => [`SMTP_${k}`, `RESET_MAIL_${k}`]);
const microsoft = { RESET_MAIL_HOST: 'smtp.office365.com', RESET_MAIL_PORT: '587', RESET_MAIL_USER: 'crm@example.test', RESET_MAIL_PASS: 'x', SMTP_FROM: 'CRM@example.test' };

beforeEach(() => {
  KEYS.forEach((k) => { delete process.env[k]; });
  created.length = 0;
});

test('RESET_MAIL_* settings send through Microsoft 365 with TLS required', async () => {
  Object.assign(process.env, microsoft);
  const result = await emailService.sendEmail({ to: 'a@example.test', subject: 's', text: 't' });
  assert.equal(result.delivery, 'email');
  assert.equal(result.provider, 'global');
  const options = created.at(-1);
  assert.equal(options.host, 'smtp.office365.com');
  assert.equal(options.port, 587);
  assert.equal(options.secure, false);
  assert.equal(options.requireTLS, true);
  assert.equal(options.auth.user, 'crm@example.test');
});

test('SMTP_* takes priority over RESET_MAIL_*', () => {
  Object.assign(process.env, microsoft, { SMTP_HOST: 'smtp.primary.test', SMTP_PORT: '465', SMTP_USER: 'p@example.test', SMTP_PASS: 'y' });
  return emailService.sendEmail({ to: 'a@example.test', subject: 's', text: 't' }).then(() => {
    const options = created.at(-1);
    assert.equal(options.host, 'smtp.primary.test');
    assert.equal(options.secure, true);
    assert.equal(options.requireTLS, false);
  });
});

test('mobile OTP and other platform mail see the account as available', () => {
  assert.equal(emailService.hasPlatformSmtpTransport(null), false);
  Object.assign(process.env, microsoft);
  assert.equal(emailService.hasPlatformSmtpTransport(null), true);
});

test('with no mail account nothing is sent', async () => {
  const result = await emailService.sendEmail({ to: 'a@example.test', subject: 's', text: 't' });
  assert.equal(result.delivery, 'preview');
});

test('a company with its own SMTP still uses it', async () => {
  Object.assign(process.env, microsoft);
  const company = { smtp_host: 'mail.tenant.test', smtp_port: 587, smtp_user: 't@tenant.test', smtp_password: 'z' };
  const result = await emailService.sendEmail({ company, to: 'a@example.test', subject: 's', text: 't' });
  assert.equal(result.provider, 'company');
  assert.equal(created.at(-1).host, 'mail.tenant.test');
});
