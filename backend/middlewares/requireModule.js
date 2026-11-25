const db = require("../db/connection");
const AppError = require("../utils/appError");
const { PLATFORM_CONSOLE_ROLES } = require("../constants/roles");

// Blocks an API when the platform has switched its module off for the company
// (for example leads for a tracking-only client). The screen hides the module too;
// this stops the data being reached another way. Modules are on unless set to false.
const CACHE_MS = 30 * 1000;
const cache = new Map();

async function companyAccess(companyId) {
  const hit = cache.get(companyId);
  if (hit && hit.until > Date.now()) return hit.access;
  const [rows] = await db.query("SELECT TOP 1 service_access FROM companies WHERE company_id = ?", [companyId]);
  let access = rows[0]?.service_access || {};
  if (typeof access === "string") {
    try { access = JSON.parse(access) || {}; } catch (_error) { access = {}; }
  }
  cache.set(companyId, { access, until: Date.now() + CACHE_MS });
  return access;
}

function forgetModuleAccess(companyId) {
  if (companyId) cache.delete(companyId);
  else cache.clear();
}

/** Allowed when at least one of the keys is not switched off. */
function requireModule(...keys) {
  return async (req, _res, next) => {
    try {
      if (!req.auth?.companyId || PLATFORM_CONSOLE_ROLES.includes(req.auth.role)) return next();
      const access = await companyAccess(req.auth.companyId);
      if (keys.some((key) => access[key] !== false)) return next();
      return next(new AppError("This is not in your company's GreenCRM plan. Ask GreenCRM to add it.", 403, { modules: keys }, "MODULE_OFF"));
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = { companyAccess, forgetModuleAccess, requireModule };
