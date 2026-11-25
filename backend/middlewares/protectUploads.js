const authenticate = require("./authenticate");
const AppError = require("../utils/appError");
const { canAccessCompany } = require("../utils/tenant");

// Lead documents (contracts, KYC, invoices) open only for a signed-in person of the same company.
// A link opened in a new tab carries no Authorization header, so the login cookie the web app keeps
// on the same site (authToken) is accepted too. Other files under /uploads stay as they are.

function readCookie(req, name) {
  const pair = String(req.headers.cookie || "").split(/;\s*/).find((part) => part.startsWith(`${name}=`));
  if (!pair) return "";
  try {
    return decodeURIComponent(pair.slice(name.length + 1));
  } catch (_error) {
    return "";
  }
}

function protectUploads(req, res, next) {
  if (!req.path.startsWith("/leads/")) return next();
  if (!req.headers.authorization) {
    const token = readCookie(req, "authToken");
    if (token) req.headers.authorization = `Bearer ${token}`;
  }
  return authenticate(req, res, async (error) => {
    if (error) return next(error);
    const [, , companyId, leadId] = req.path.split("/").map((part) => {
      try { return decodeURIComponent(part); } catch (_e) { return ""; }
    });
    if (!companyId || !leadId || !canAccessCompany(req.auth, companyId)) {
      return next(new AppError("You cannot open this document.", 403));
    }
    try {
      // Same rule as opening the lead itself (owner, shared, team, manager or admin).
      const lead = await require("../services/leadService").getLead(req.auth, leadId, { view: "core" });
      if (!lead || lead.company_id !== companyId) throw new AppError("You cannot open this document.", 403);
    } catch (accessError) {
      return next(accessError instanceof AppError && accessError.statusCode === 404 ? new AppError("Document not found.", 404) : new AppError("You cannot open this document.", 403));
    }
    res.set("Cache-Control", "private, no-store");
    res.set("X-Content-Type-Options", "nosniff");
    // The browser's own PDF and image viewers need their defaults here.
    res.removeHeader("Content-Security-Policy");
    return next();
  });
}

module.exports = { protectUploads, readCookie };
