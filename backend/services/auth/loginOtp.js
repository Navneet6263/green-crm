// Email check at login: after the password, the person gets a 6-digit code by email, once a month.
// Entering it proves the email is real, and only proven emails get the CRM's reminder emails.
// If the CRM cannot send email at all, login goes ahead without the code (no one is locked out by a mail outage).
const crypto = require("node:crypto");
const { query } = require("../../db/connection");
const AppError = require("../../utils/appError");

const VERIFY_EVERY_DAYS = 30;
const CODE_MINUTES = 10;
const MAX_TRIES = 5;
const MAX_CODES_PER_HOUR = 5;
// Reminder emails go to people who proved their email in this many days (the monthly check plus a little slack).
const MAIL_WINDOW_DAYS = 40;
const VERIFIED_SQL = (alias = "u") => `${alias}.email_verified_at >= DATEADD(day, -${MAIL_WINDOW_DAYS}, SYSUTCDATETIME())`;

const enabled = (env = process.env) => String(env.LOGIN_EMAIL_OTP || "").toLowerCase() !== "off";
const secret = () => process.env.AUTH_SECRET || process.env.JWT_SECRET || "greencrm-login-code";
const hashCode = (challengeId, code) => crypto.createHmac("sha256", secret()).update(`${challengeId}:${code}`).digest("hex");

/** True when this person has not proven their email in the last 30 days. */
function needsCheck(user, now = Date.now(), env = process.env) {
  if (!enabled(env) || !user) return false;
  const at = user.email_verified_at ? new Date(user.email_verified_at).getTime() : 0;
  return !at || now - at > VERIFY_EVERY_DAYS * 86400000;
}

/** "navneet@gmail.com" -> "na*****@gmail.com" */
function emailHint(email) {
  const [local = "", domain = ""] = String(email || "").split("@");
  return `${local.slice(0, 2)}${"*".repeat(Math.max(local.length - 2, 3))}@${domain}`;
}

function codeEmail(user, code) {
  const { escapeHtml } = require("../emailService");
  const { layout } = require("../mail/brandedEmail");
  const first = String(user.name || "").split(" ")[0];
  const body = `<p style="margin:0 0 14px;font-size:14px;color:#334155">Hi ${escapeHtml(first)}, use this code to finish signing in to GreenCRM.</p>
<div style="margin:6px 0 14px;padding:16px;border-radius:12px;background:#f1f7f6;border:1px solid #d5e7e5;text-align:center;font-size:32px;font-weight:bold;letter-spacing:10px;color:#0c605d">${code}</div>
<p style="margin:0;font-size:13px;color:#64748b">The code works for ${CODE_MINUTES} minutes. We ask once a month to make sure your email is right, so your reminders reach you. If this was not you, change your password.</p>`;
  return {
    subject: `${code} is your GreenCRM sign-in code`,
    text: `Your GreenCRM sign-in code is ${code}. It works for ${CODE_MINUTES} minutes.`,
    html: layout({ preheader: `Your sign-in code is ${code}`, heading: "Your sign-in code", body }),
  };
}

/**
 * Sends a code. Returns { challenge_id, email_hint }, or null when the email could not be sent
 * (then the caller lets the person in without the code).
 */
async function start(user, { company, platformCompany }, deps = {}) {
  const [recent] = await query(
    "SELECT COUNT(*) AS total FROM login_email_otps WHERE user_id = ? AND created_at > DATEADD(hour, -1, SYSUTCDATETIME())",
    [user.user_id]
  );
  if (Number(recent[0]?.total || 0) >= MAX_CODES_PER_HOUR) throw new AppError("Too many codes asked for. Please wait a while and try again.", 429);

  const challengeId = crypto.randomUUID();
  const code = crypto.randomInt(0, 1000000).toString().padStart(6, "0");
  await query(
    "INSERT INTO login_email_otps (challenge_id, user_id, code_hash, expires_at) VALUES (?, ?, ?, DATEADD(minute, ?, SYSUTCDATETIME()))",
    [challengeId, user.user_id, hashCode(challengeId, code), CODE_MINUTES]
  );
  const send = deps.sendEmail || require("../emailService").sendEmail;
  const { LOGO_CID } = require("../mail/brandedEmail");
  const path = require("node:path");
  const result = await send({
    company, platformCompany, to: user.email, ...codeEmail(user, code), redactErrors: true,
    attachments: [{ filename: "greencrm-logo.png", path: path.join(__dirname, "../../assets/email/greencrm-logo.png"), cid: LOGO_CID }],
  });
  if (result?.delivery !== "email") {
    await query("DELETE FROM login_email_otps WHERE challenge_id = ?", [challengeId]).catch(() => {});
    return null;
  }
  return { challenge_id: challengeId, email_hint: emailHint(user.email) };
}

/** Checks a code. Returns the user id and marks the email as proven; throws with a plain message otherwise. */
async function verify(challengeId, code) {
  const id = String(challengeId || "").trim();
  const value = String(code || "").replace(/\D/g, "");
  if (!id || value.length !== 6) throw new AppError("Enter the 6-digit code from your email.", 400);
  const [rows] = await query(
    "SELECT TOP 1 challenge_id, user_id, code_hash, attempts, CASE WHEN expires_at < SYSUTCDATETIME() THEN 1 ELSE 0 END AS expired FROM login_email_otps WHERE challenge_id = ? AND used_at IS NULL",
    [id]
  );
  const row = rows[0];
  if (!row || Number(row.expired)) throw new AppError("This code has expired. Sign in again to get a new one.", 400);
  if (Number(row.attempts) >= MAX_TRIES) throw new AppError("Too many wrong tries. Sign in again to get a new code.", 429);
  const expected = Buffer.from(row.code_hash, "hex");
  const given = Buffer.from(hashCode(id, value), "hex");
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
    await query("UPDATE login_email_otps SET attempts = attempts + 1 WHERE challenge_id = ?", [id]);
    throw new AppError(`That code is not right. ${Math.max(MAX_TRIES - Number(row.attempts) - 1, 0)} tries left.`, 400);
  }
  await query("UPDATE login_email_otps SET used_at = SYSUTCDATETIME() WHERE challenge_id = ?", [id]);
  await markVerified(row.user_id);
  return row.user_id;
}

/** The email was proven some other way (for example the mobile app's email code). */
async function markVerified(userId) {
  if (!userId) return;
  await query("UPDATE users SET email_verified_at = SYSUTCDATETIME() WHERE user_id = ?", [userId]);
}

module.exports = { MAIL_WINDOW_DAYS, VERIFIED_SQL, emailHint, enabled, hashCode, markVerified, needsCheck, start, verify };
