const db = require("../../db/connection");
const AppError = require("../../utils/appError");

// Too many wrong passwords for one account lock it for a short while, whatever address they come from.
// The per-address limit (authRateLimiter) still applies on top.
const MAX_FAILURES = 8;
const LOCK_MINUTES = 15;

function assertNotLocked(user) {
  const until = user?.lock_until ? new Date(user.lock_until).getTime() : 0;
  if (until > Date.now()) {
    const minutes = Math.max(1, Math.ceil((until - Date.now()) / 60000));
    throw new AppError(`Too many wrong passwords. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}, or reset your password.`, 429, null, "ACCOUNT_LOCKED");
  }
}

async function recordFailure(user) {
  await db.query(
    `UPDATE users SET login_attempts = COALESCE(login_attempts, 0) + 1,
       lock_until = CASE WHEN COALESCE(login_attempts, 0) + 1 >= ? THEN DATEADD(minute, ?, SYSUTCDATETIME()) ELSE lock_until END
     WHERE user_id = ?`,
    [MAX_FAILURES, LOCK_MINUTES, user.user_id]
  ).catch((error) => console.warn("[login] could not count a failed attempt:", error.message));
}

async function recordSuccess(user) {
  if (!user?.login_attempts && !user?.lock_until) return;
  await db.query("UPDATE users SET login_attempts = 0, lock_until = NULL WHERE user_id = ?", [user.user_id])
    .catch((error) => console.warn("[login] could not reset the attempt count:", error.message));
}

module.exports = { LOCK_MINUTES, MAX_FAILURES, assertNotLocked, recordFailure, recordSuccess };
