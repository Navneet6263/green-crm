const db = require("../../db/connection");
const AppError = require("../../utils/appError");

// The Developer page is off for every company until a super admin switches on
// `developer_api` in the company's module access. Only the company admin uses it.
const ACCESS_KEY = "developer_api";
const CACHE_MS = 30 * 1000;
const cache = new Map();

function parseAccess(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw) || {}; } catch (_error) { return {}; }
}

/** True when the company may use API keys and lead capture links (switched on and not suspended). */
async function isEnabled(companyId, { fresh = false } = {}) {
  if (!companyId) return false;
  const hit = cache.get(companyId);
  if (!fresh && hit && hit.until > Date.now()) return hit.enabled;
  const [rows] = await db.query("SELECT TOP 1 status, service_access FROM companies WHERE company_id = ?", [companyId]);
  const company = rows[0];
  const enabled = Boolean(company) && company.status !== "suspended" && parseAccess(company.service_access)[ACCESS_KEY] === true;
  cache.set(companyId, { enabled, until: Date.now() + CACHE_MS });
  return enabled;
}

function forget(companyId) {
  cache.delete(companyId);
}

/** Express middleware for the admin's Developer page. */
async function requireDeveloperAdmin(req, _res, next) {
  try {
    if (req.auth?.role !== "admin") {
      throw new AppError("Only the company admin can open the Developer page.", 403, null, "DEVELOPER_ADMIN_ONLY");
    }
    if (!(await isEnabled(req.auth.companyId, { fresh: true }))) {
      throw new AppError("Developer API is not switched on for your company. Ask GreenCRM to turn it on.", 403, null, "DEVELOPER_OFF");
    }
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Company admins cannot change their own plan. Platform admins can change module access,
 * but only the super admin can switch the Developer API on or off.
 */
function guardServiceAccess(role, currentRaw, nextRaw) {
  const current = parseAccess(currentRaw);
  const next = { ...parseAccess(nextRaw) };
  if (role !== "super-admin") {
    if (current[ACCESS_KEY] === true) next[ACCESS_KEY] = true;
    else delete next[ACCESS_KEY];
  }
  return next;
}

module.exports = { ACCESS_KEY, forget, guardServiceAccess, isEnabled, parseAccess, requireDeveloperAdmin };
