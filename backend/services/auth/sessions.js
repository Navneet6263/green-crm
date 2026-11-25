const db = require("../../db/connection");

// "Sign out everywhere": every login token issued before users.sessions_revoked_at stops working.
// Set when the user asks for it, and whenever a password is changed or reset.

async function ensureColumn(pool) {
  await pool.request().query(`
    IF COL_LENGTH('users', 'sessions_revoked_at') IS NULL
      ALTER TABLE users ADD sessions_revoked_at DATETIME2 NULL;
  `);
}

async function revokeSessions(userId, executor = db) {
  await executor.query("UPDATE users SET sessions_revoked_at = SYSUTCDATETIME() WHERE user_id = ?", [userId]);
}

/** True when the token was issued before the user's last "sign out everywhere". */
function isRevoked(user, payload) {
  if (!user?.sessions_revoked_at || !payload?.iat) return false;
  // Whole seconds: a token made in the same second as the sign-out (the new one) stays valid.
  return Number(payload.iat) < Math.floor(new Date(user.sessions_revoked_at).getTime() / 1000);
}

module.exports = { ensureColumn, isRevoked, revokeSessions };
