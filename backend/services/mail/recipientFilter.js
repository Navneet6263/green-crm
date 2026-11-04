// Decides whether an address is worth emailing: a real-looking address on a domain that takes mail,
// not one made up for testing, and not one that has bounced before.
const dns = require("node:dns").promises;
const { query } = require("../../db/connection");

const SHAPE = /^[^\s@<>()",;]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;
// Reserved and throwaway domains, and domains people type when making a test account.
const BLOCKED_DOMAINS = new Set([
  "example.com", "example.org", "example.net", "test.com", "testing.com", "test.in", "abc.com", "xyz.com", "domain.com", "email.com",
  "mailinator.com", "yopmail.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "temp-mail.org", "trashmail.com", "sharklasers.com",
]);
const BLOCKED_TLDS = /\.(test|example|invalid|localhost|local)$/i;
// "test@", "test1@", "sales.test@", "dummy_2@" and similar.
const TEST_LOCAL = /(^|[._+-])(test|testing|dummy|fake|sample)\d*([._+-]|$)/i;

const DAY = 86400000;
const mxCache = new Map();

/** Why this address should not get mail, or "" when it looks fine. Checks the text only (no network). */
function shapeProblem(email) {
  const value = String(email || "").trim().toLowerCase();
  if (!SHAPE.test(value)) return "not a valid email address";
  const [local, domain] = value.split("@");
  if (BLOCKED_DOMAINS.has(domain) || BLOCKED_TLDS.test(domain)) return "test or throwaway domain";
  if (TEST_LOCAL.test(local)) return "looks like a test address";
  return "";
}

/** Does the domain accept mail? Cached for a day. A DNS failure counts as yes, so a network blip does not stop mail. */
async function domainTakesMail(domain, resolver = dns) {
  const hit = mxCache.get(domain);
  if (hit && hit.at > Date.now() - DAY) return hit.ok;
  let ok = true;
  try {
    const mx = await resolver.resolveMx(domain);
    ok = mx.some((r) => r.exchange && r.exchange !== ".");
  } catch (error) {
    if (["ENOTFOUND", "ENODATA", "NXDOMAIN"].includes(error.code)) {
      // No MX: mail can still go to the domain's own address record.
      ok = await resolver.resolve4(domain).then((a) => a.length > 0).catch(() => false);
    }
  }
  mxCache.set(domain, { ok, at: Date.now() });
  return ok;
}

async function isSuppressed(email) {
  const [rows] = await query("SELECT TOP 1 email FROM email_suppressions WHERE email = ?", [String(email).trim().toLowerCase()]);
  return rows.length > 0;
}

/** "" when the address can be emailed, else the reason it is skipped. */
async function skipReason(email, deps = {}) {
  const problem = shapeProblem(email);
  if (problem) return problem;
  const value = String(email).trim().toLowerCase();
  if (await (deps.isSuppressed || isSuppressed)(value)) return "bounced before";
  if (!(await domainTakesMail(value.split("@")[1], deps.resolver))) return "domain does not take email";
  return "";
}

/** Never email this address again (it bounced, or the mail server said it does not exist). */
async function suppress(email, reason, source = "bounce") {
  const value = String(email || "").trim().toLowerCase();
  if (!SHAPE.test(value)) return false;
  await query(
    `MERGE email_suppressions AS t USING (SELECT ? AS email) AS s ON t.email = s.email
     WHEN NOT MATCHED THEN INSERT (email, reason, source) VALUES (?, ?, ?);`,
    [value, value, String(reason || "").slice(0, 400), source]
  );
  return true;
}

/** A send error that means "this mailbox does not exist" (SMTP 550 / 5.1.x), not a temporary problem. */
function isPermanentRejection(message) {
  return /\b55[0-3]\b|5\.1\.[0-9]|user unknown|does not exist|no such user|recipient (address )?rejected|mailbox unavailable/i.test(String(message || ""));
}

module.exports = { domainTakesMail, isPermanentRejection, shapeProblem, skipReason, suppress };
