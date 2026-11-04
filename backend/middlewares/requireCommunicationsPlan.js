const { query } = require("../db/connection");
const AppError = require("../utils/appError");
const { PLATFORM_CONSOLE_ROLES } = require("../constants/roles");

// Sending to customers (email, WhatsApp, SMS, call) is blocked when the platform has switched
// Communications off for the company. The screen still shows the feature, locked.
async function requireCommunicationsPlan(req, _res, next) {
  if (PLATFORM_CONSOLE_ROLES.includes(req.auth?.role) || !req.auth?.companyId) return next();
  const [rows] = await query("SELECT service_access FROM companies WHERE company_id = ?", [req.auth.companyId]);
  let access = rows[0]?.service_access || {};
  if (typeof access === "string") {
    try { access = JSON.parse(access) || {}; } catch (_e) { access = {}; }
  }
  if (access.communications === false) {
    return next(new AppError("Communications is not in your company's plan. Ask your admin to upgrade with GreenCRM.", 403));
  }
  return next();
}

module.exports = requireCommunicationsPlan;
