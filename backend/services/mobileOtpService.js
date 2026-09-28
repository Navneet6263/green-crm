const crypto = require('crypto');
const AppError = require('../utils/appError');

const INVALID = 'Invalid or expired login code. Request a new code if needed.';
const normalizeEmail = value => {
  if (typeof value !== 'string' || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    throw new AppError('Enter a valid work email.', 400);
  }
  return value.trim().toLowerCase();
};

function createMobileOtpService({ repository, mailer, companyRepository, platformCompanyId, buildAuthToken,
  env = process.env, schedule = setImmediate, warn = message => console.warn(message) }) {
  const configuration = () => {
    const secret = env.CRM_MOBILE_OTP_SECRET || '';
    const signing = env.AUTH_SECRET || env.JWT_SECRET || '';
    if (env.CRM_MOBILE_EMAIL_OTP_ENABLED !== 'true' || secret.length < 32 || signing.length < 32 ||
        /replace-this|change.?me|greencrm-dev-secret/i.test(secret + signing)) {
      throw new AppError('Email OTP is not available. Please use your password.', 503);
    }
    return secret;
  };
  const digest = (secret, ...parts) => crypto.createHmac('sha256', secret).update(JSON.stringify(parts)).digest('hex');

  async function request(payload, ip) {
    const secret = configuration();
    const email = normalizeEmail(payload?.email);
    const platformCompany = await companyRepository.getCompanyWithSettings(platformCompanyId);
    if (!mailer.hasPlatformSmtpTransport(platformCompany)) throw new AppError('Email OTP is not available. Please use your password.', 503);
    const challengeId = crypto.randomUUID();
    const code = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
    const emailKey = digest(secret, 'email', email);
    const reserved = await repository.reserve({ email, emailKey, ipKey: digest(secret, 'ip', String(ip || 'unknown')),
      challengeId, codeHash: digest(secret, 'code', emailKey, challengeId, code) });
    if (!reserved) throw new AppError('Too many code requests. Please wait before trying again.', 429);
    // Always queue after reserving, including unknown/inactive/non-sales addresses.
    // SMTP latency must not reveal account existence. Codes never leave via HTTP/logs.
    schedule(() => {
      void (async () => {
        if (reserved.user) {
          const result = await mailer.sendCustomEmail({ platformCompany, to: email, redactErrors: true,
            subject: 'Your GreenCRM sales login code', heading: 'Sign in to GreenCRM',
            body: `Your login code is ${code}.\n\nThis code expires in 5 minutes and works once. Do not share it with anyone.\nIf you did not request it, ignore this email.` });
          if (result?.delivery !== 'email') throw new Error('Delivery unavailable');
        }
      })().catch(async () => {
        warn('[mobile-otp] Email delivery failed. No code or address logged.');
        await repository.invalidate(challengeId).catch(() => warn('[mobile-otp] Challenge invalidation failed.'));
      }).finally(() => { void repository.cleanup().catch(() => warn('[mobile-otp] Cleanup deferred.')); });
    });
    return { challenge_id: challengeId, expires_in: 300, retry_after: 60,
      message: 'If this is an active sales account, a login code will arrive by email.' };
  }

  async function verify(payload) {
    const secret = configuration();
    const email = normalizeEmail(payload?.email);
    const challengeId = typeof payload?.challenge_id === 'string' ? payload.challenge_id.toLowerCase() : '';
    const code = payload?.code;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(challengeId) || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      throw new AppError(INVALID, 401);
    }
    const emailKey = digest(secret, 'email', email);
    const expected = Buffer.from(digest(secret, 'code', emailKey, challengeId, code), 'hex');
    const result = await repository.consume({ email, emailKey, challengeId, matches: stored => {
      const actual = Buffer.from(stored || '', 'hex');
      return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
    } });
    if (!result || result.user?.role !== 'sales' || !result.user.is_active) throw new AppError(INVALID, 401);
    const { user_id, company_id, name, email: workEmail, role } = result.user;
    return { token: buildAuthToken(result.user), user: { user_id, company_id, name, email: workEmail, role },
      company: { company_id: result.company.company_id, name: result.company.name } };
  }
  return { request, verify };
}

module.exports = { createMobileOtpService };
