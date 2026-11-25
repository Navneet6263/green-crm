// Standard protective headers on every API answer, without extra packages.
// API answers are never stored by browsers or proxies, so one person's data can never be served to another.
function securityHeaders(req, res, next) {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Cross-Origin-Opener-Policy": "same-origin",
    "X-Permitted-Cross-Domain-Policies": "none",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  });
  if (req.secure) res.set("Strict-Transport-Security", "max-age=31536000");
  // Downloads (Excel, documents) may set their own value later; JSON answers keep this one.
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
}

module.exports = securityHeaders;
