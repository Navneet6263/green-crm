const express = require("express");
const cors = require("cors");

const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/appError");
const { authenticateApiKey, requireScope } = require("../services/developer/apiKeys");
const { idempotency } = require("../services/developer/idempotency");
const { captureLead } = require("../services/developer/leadCapture");
const limits = require("../services/developer/limits");
const { buildSpec } = require("../services/developer/openapi");
const publicLeads = require("../services/developer/publicLeads");
const { logRequests } = require("../services/developer/requestLog");

// /api/v1: the public API (API key) and lead capture links (secret URL).
// Mounted before the app's CORS rules, because websites and tools on any domain call it.
// It never accepts a CRM login token or cookie.
const router = express.Router();

router.use(cors({
  origin: "*", credentials: false, methods: ["GET", "POST", "PATCH", "OPTIONS"], maxAge: 86400,
  allowedHeaders: ["Authorization", "Content-Type", "X-API-Key", "Idempotency-Key", "X-Dry-Run"],
  exposedHeaders: ["X-Request-Id", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset", "Retry-After", "Idempotent-Replayed"],
}));
router.use(express.json({ limit: "200kb" }));
router.use(express.urlencoded({ extended: true, limit: "200kb" }));
router.use(express.text({ type: "text/plain", limit: "200kb" }));
router.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

const send = (res, data, meta = null, status = 200) => res.status(status).json({ success: true, data, meta });
// Test mode: check the request, save nothing.
const isDryRun = (req) => String(req.headers["x-dry-run"] || req.query.dry_run || "").toLowerCase() === "true";

// Lead capture: website forms, Zapier / Make / Pabbly, Facebook and Google Ads lead forms, IndiaMART.
function wantsPage(req) {
  return req.is("application/x-www-form-urlencoded") && String(req.headers.accept || "").includes("text/html");
}

function thankYouPage(title, text) {
  const safe = (value) => String(value).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safe(title)}</title></head>`
    + `<body style="margin:0;font-family:Arial,sans-serif;background:#FBF9F3;color:#1f2937;display:flex;min-height:100vh;align-items:center;justify-content:center">`
    + `<div style="max-width:420px;padding:32px;background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,.08);text-align:center">`
    + `<h1 style="font-size:22px;margin:0 0 8px;color:#0C605D">${safe(title)}</h1><p style="margin:0;font-size:15px;line-height:1.5">${safe(text)}</p>`
    + `<p style="margin:20px 0 0"><a href="javascript:history.back()" style="color:#0C605D">Go back</a></p></div></body></html>`;
}

/** A form may pick its own thank-you page only on the same website as the link's saved one. */
function safeRedirect(requested, saved) {
  if (!saved) return null;
  try {
    const allowed = new URL(saved);
    const target = requested ? new URL(requested) : allowed;
    return ["http:", "https:"].includes(target.protocol) && target.host === allowed.host ? target.toString() : allowed.toString();
  } catch (_error) {
    return saved;
  }
}

function parseBody(req) {
  if (typeof req.body !== "string") return req.body || {};
  try { return JSON.parse(req.body); } catch (_error) { return { message: req.body }; }
}

// Zapier, Pabbly and Google send from shared addresses, so the per-visitor limit is generous;
// the per-link limit is what stops a flood.
router.post("/capture/:token", limits.byVisitor, limits.byLink, logRequests("capture"), asyncHandler(async (req, res) => {
  req.developer = {};
  const body = parseBody(req);
  const result = await captureLead(req.params.token, body, req.developer);
  if (wantsPage(req)) {
    const target = safeRedirect(String(body._redirect || "").trim(), req.developer.redirect);
    if (target) return res.redirect(303, target);
    return res.status(200).type("html").send(thankYouPage("Thank you!", "We have your details. Our team will get in touch with you soon."));
  }
  return send(res, { received: true, lead_id: result.lead_id, duplicate: result.duplicate }, null, result.duplicate ? 200 : 201);
}));

router.get("/capture/:token", (_req, res) => {
  res.status(405).set("Allow", "POST").json({ success: false, error: "Send leads to this link with POST.", code: "METHOD_NOT_ALLOWED" });
});

// The API description, open to all so tools can import it.
router.get("/openapi.json", (req, res) => res.json(buildSpec(`${req.protocol}://${req.get("host")}${req.baseUrl}`)));

// API key routes. The address limit comes before the key check, so guessing keys cannot hammer the database.
router.use(limits.byAddress, logRequests("api"), asyncHandler(authenticateApiKey), limits.byKey, limits.byCompanyDay, idempotency);
router.use((req, _res, next) => {
  if (isDryRun(req) && req.method !== "GET") req.developer.message = "Test mode, nothing saved";
  next();
});

router.get("/me", (req, res) => send(res, {
  company_id: req.auth.companyId,
  key: { id: req.apiKey.keyId, name: req.apiKey.name, scopes: req.apiKey.scopes },
  acting_as: { id: req.auth.userId, name: req.auth.name, role: req.auth.role },
}));

router.get("/leads", requireScope("leads:read"), asyncHandler(async (req, res) => {
  const result = await publicLeads.listLeads(req.auth, req.query);
  send(res, result.items, result.meta);
}));
router.get("/leads/:id", requireScope("leads:read"), asyncHandler(async (req, res) => send(res, await publicLeads.getLead(req.auth, req.params.id, req.query))));
router.post("/leads", requireScope("leads:write"), asyncHandler(async (req, res) => {
  const dryRun = isDryRun(req);
  const lead = await publicLeads.createLead(req.auth, parseBody(req), { dryRun });
  if (!dryRun) req.developer.leadId = lead.id;
  send(res, lead, null, dryRun ? 200 : 201);
}));
router.patch("/leads/:id", requireScope("leads:write"), asyncHandler(async (req, res) => {
  req.developer.leadId = req.params.id;
  send(res, await publicLeads.updateLead(req.auth, req.params.id, parseBody(req), { dryRun: isDryRun(req), keyName: req.apiKey.name }));
}));
router.post("/leads/:id/notes", requireScope("leads:write"), asyncHandler(async (req, res) => {
  const dryRun = isDryRun(req);
  req.developer.leadId = req.params.id;
  send(res, await publicLeads.addNote(req.auth, req.params.id, parseBody(req), { dryRun }), null, dryRun ? 200 : 201);
}));
router.get("/products", requireScope("leads:read"), asyncHandler(async (req, res) => send(res, await publicLeads.listProducts(req.auth))));
router.get("/users", requireScope("leads:read"), asyncHandler(async (req, res) => send(res, await publicLeads.listUsers(req.auth))));

router.use((req, _res, next) => next(new AppError(`No such API route: ${req.method} ${req.originalUrl.split("?")[0]}`, 404, null, "NOT_FOUND")));

// eslint-disable-next-line no-unused-vars
router.use((error, req, res, _next) => {
  const known = error instanceof AppError;
  const status = known ? error.statusCode : error?.type === "entity.too.large" ? 413 : error?.type === "entity.parse.failed" ? 400 : 500;
  const message = known ? error.message : status === 413 ? "The request body is too large." : status === 400 ? "The request body is not valid JSON." : "Something went wrong on our side. Please try again.";
  if (!known && status === 500) console.error("[api v1]", error);
  res.locals.errorMessage = message;
  if (req.path.startsWith("/capture/") && wantsPage(req)) {
    return res.status(status).type("html").send(thankYouPage("Sorry, that did not go through", message));
  }
  return res.status(status).json({
    success: false, error: message, code: known ? error.code || null : null,
    details: known ? error.details || null : null, request_id: res.getHeader("X-Request-Id") || null,
  });
});

module.exports = router;
