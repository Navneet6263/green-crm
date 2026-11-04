const express = require("express");
const authenticate = require("../middlewares/authenticate");
const asyncHandler = require("../utils/asyncHandler");
const { createRateLimiter } = require("../middlewares/rateLimiter");
const nudgeService = require("../services/nudges/nudgeService");
const inbox = require("../services/mail/graphInbox");
const AppError = require("../utils/appError");

const router = express.Router();
router.use(asyncHandler(authenticate));

// Screenshots make these bodies bigger than the app-wide 1 MB limit.
const bigJson = express.json({ limit: "8mb" });
const sendLimit = createRateLimiter({ windowMs: 60 * 60000, max: 40, keyGenerator: (req) => `nudge:${req.auth.companyId}:${req.auth.userId}` });

router.get("/config", asyncHandler(async (req, res) => {
  res.json({ data: await nudgeService.getConfig(req.auth) });
}));

router.get("/", asyncHandler(async (req, res) => {
  res.json({ data: await nudgeService.listNudges(req.auth, req.query) });
}));

router.post("/", bigJson, sendLimit, asyncHandler(async (req, res) => {
  const result = req.body?.kind === "person"
    ? await require("../services/reports/personEmail").emailPersonReport(req.auth, req.body)
    : await nudgeService.sendNudge(req.auth, req.body);
  res.status(201).json({ data: result });
}));

router.get("/replies", asyncHandler(async (req, res) => {
  res.json({ data: await nudgeService.listRecentReplies(req.auth, req.query) });
}));

// Admin: confirm the Microsoft 365 setup (token, permission, mailbox) in one call.
router.get("/inbox/test", asyncHandler(async (req, res) => {
  if (!nudgeService.canSend(req.auth)) throw new AppError("Only admins can do this.", 403);
  res.json({ data: await inbox.testConnection() });
}));

// Admin "check now" for replies; the background job does the same every few minutes.
router.post("/inbox/sync", asyncHandler(async (req, res) => {
  if (!nudgeService.canSend(req.auth)) throw new AppError("Only admins can do this.", 403);
  if (!inbox.configured()) throw new AppError("The Microsoft 365 inbox is not connected yet.", 409);
  res.json({ data: await inbox.syncInbox() });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  res.json({ data: await nudgeService.getNudge(req.auth, req.params.id) });
}));

module.exports = router;
