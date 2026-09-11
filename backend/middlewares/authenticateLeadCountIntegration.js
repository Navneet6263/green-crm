const { createHash, timingSafeEqual } = require("node:crypto");
const AppError = require("../utils/appError");

// This opaque credential is deliberately NOT a CRM session/JWT. Only the
// lead-count integration route accepts it; normal CRM routes still reject it.
function authenticateLeadCountIntegration(req, _res, next) {
  const companyId = (process.env.CRM_LEAD_COUNTS_COMPANY_ID || "").trim();
  const expectedHash = process.env.CRM_LEAD_COUNTS_KEY_SHA256 || "";
  const expiry = process.env.CRM_LEAD_COUNTS_KEY_EXPIRES_AT || "";
  const expiresAt = Date.parse(expiry);
  if (!companyId || companyId.length > 20 || !/^[a-f0-9]{64}$/i.test(expectedHash)
      || !expiry.endsWith("Z") || !Number.isFinite(expiresAt)) {
    return next(new AppError("Lead-count integration is not configured", 503));
  }

  const match = /^Bearer (crm_lc_[a-f0-9]{64})$/.exec(req.headers.authorization || "");
  if (!match || expiresAt <= Date.now()) {
    return next(new AppError("Invalid or expired integration key", 401));
  }
  const actualHash = createHash("sha256").update(match[1]).digest();
  if (!timingSafeEqual(actualHash, Buffer.from(expectedHash, "hex"))) {
    return next(new AppError("Invalid or expired integration key", 401));
  }

  // Never accept a company/employee scope supplied by the caller.
  req.leadCountIntegration = { companyId };
  return next();
}

module.exports = authenticateLeadCountIntegration;
