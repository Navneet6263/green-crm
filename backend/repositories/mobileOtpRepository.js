const db = require('../db/connection');
const acquireLock = require('./transactionLock');

async function eligibleUser(tx, email) {
  // Refuse ambiguous addresses; never select an arbitrary company for OTP login.
  const [users] = await tx.query(`SELECT TOP 2 user_id, company_id, name, email, role,
    CASE WHEN is_active = 1 AND ISNULL(two_factor_enabled, 0) = 0
      AND (lock_until IS NULL OR lock_until <= CURRENT_TIMESTAMP) THEN 1 ELSE 0 END AS is_active
    FROM users WHERE email = ?`, [email]);
  return users.length === 1 && users[0].is_active && users[0].role === 'sales' ? users[0] : null;
}

async function reserve({ email, emailKey, ipKey, challengeId, codeHash }) {
  return db.withTransaction(async tx => {
    // SQL application locks cover multiple PM2 workers, missing rows and resends.
    for (const key of [emailKey, ipKey].sort()) await acquireLock(tx, `mobile-otp:${key}`);
    const limits = [{ key: emailKey, max: 5, cooldown: 60 }, { key: ipKey, max: 20, cooldown: 0 }];
    const states = [];
    for (const limit of limits) {
      const [rows] = await tx.query(`SELECT request_count,
        DATEDIFF(SECOND, window_started_at, SYSUTCDATETIME()) AS window_age,
        DATEDIFF(SECOND, last_requested_at, SYSUTCDATETIME()) AS last_age
        FROM dbo.mobile_login_otp_limits WHERE scope_key = ?`, [limit.key]);
      const row = rows[0];
      if (row && (row.last_age < limit.cooldown || (row.window_age < 900 && row.request_count >= limit.max))) return null;
      states.push({ ...limit, row });
    }
    for (const { key, row } of states) {
      if (!row) await tx.query(`INSERT INTO dbo.mobile_login_otp_limits
        (scope_key, window_started_at, last_requested_at, request_count) VALUES (?, SYSUTCDATETIME(), SYSUTCDATETIME(), 1)`, [key]);
      else await tx.query(`UPDATE dbo.mobile_login_otp_limits SET last_requested_at = SYSUTCDATETIME(),
        request_count = CASE WHEN DATEDIFF(SECOND, window_started_at, SYSUTCDATETIME()) >= 900 THEN 1 ELSE request_count + 1 END,
        window_started_at = CASE WHEN DATEDIFF(SECOND, window_started_at, SYSUTCDATETIME()) >= 900 THEN SYSUTCDATETIME() ELSE window_started_at END
        WHERE scope_key = ?`, [key]);
    }
    const user = await eligibleUser(tx, email);
    await tx.query('UPDATE dbo.mobile_login_otps SET consumed_at = SYSUTCDATETIME() WHERE email_key = ? AND consumed_at IS NULL', [emailKey]);
    await tx.query(`INSERT INTO dbo.mobile_login_otps (challenge_id, email_key, user_id, company_id, code_hash, expires_at)
      VALUES (?, ?, ?, ?, ?, DATEADD(MINUTE, 5, SYSUTCDATETIME()))`, [challengeId, emailKey, user?.user_id || null, user?.company_id || null, codeHash]);
    return { user };
  });
}

async function consume({ email, emailKey, challengeId, matches }) {
  return db.withTransaction(async tx => {
    // Same email lock as request means resend and verify cannot race each other.
    await acquireLock(tx, `mobile-otp:${emailKey}`);
    const [rows] = await tx.query(`SELECT *, CASE WHEN expires_at > SYSUTCDATETIME() THEN 1 ELSE 0 END AS valid_time
      FROM dbo.mobile_login_otps WITH (UPDLOCK, ROWLOCK) WHERE challenge_id = ? AND email_key = ?`, [challengeId, emailKey]);
    const row = rows[0];
    if (!row || row.consumed_at || !row.valid_time || row.attempts >= 5) return null;
    if (!matches(row.code_hash)) {
      // Return, don't throw: failed attempts MUST commit rather than roll back.
      await tx.query('UPDATE dbo.mobile_login_otps SET attempts = attempts + 1 WHERE challenge_id = ?', [challengeId]);
      return null;
    }
    const user = await eligibleUser(tx, email);
    await tx.query('UPDATE dbo.mobile_login_otps SET consumed_at = SYSUTCDATETIME() WHERE challenge_id = ?', [challengeId]);
    if (!user || user.user_id !== row.user_id || user.company_id !== row.company_id) return null;
    const [companies] = await tx.query('SELECT company_id, name FROM companies WHERE company_id = ?', [user.company_id]);
    if (!companies[0]) return null;
    await tx.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE user_id = ?', [user.user_id]);
    return { user, company: companies[0] };
  });
}

async function invalidate(challengeId) {
  await db.query('UPDATE dbo.mobile_login_otps SET consumed_at = SYSUTCDATETIME() WHERE challenge_id = ? AND consumed_at IS NULL', [challengeId]);
}

// Maintenance is deliberately separate from login transactions to avoid lock inversion.
async function cleanup() {
  await db.query('DELETE TOP (1000) FROM dbo.mobile_login_otps WHERE expires_at < DATEADD(DAY, -1, SYSUTCDATETIME())');
  await db.query('DELETE TOP (1000) FROM dbo.mobile_login_otp_limits WHERE last_requested_at < DATEADD(DAY, -1, SYSUTCDATETIME())');
}

module.exports = { reserve, consume, invalidate, cleanup };
