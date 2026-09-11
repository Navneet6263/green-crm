const express = require("express");
const authenticateIntegration = require("../middlewares/authenticateLeadCountIntegration");
const { createRateLimiter } = require("../middlewares/rateLimiter");
const repository = require("../repositories/leadCountIntegrationRepository");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/appError");

const router = express.Router();
const path = "/v1/employee-lead-counts";
const limiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: req => req.leadCountIntegration.companyId,
});

router.all(path, (req, res, next) => {
  res.set("Cache-Control", "no-store");
  res.set("Pragma", "no-cache");
  if (req.method !== "GET") {
    res.set("Allow", "GET");
    return next(new AppError("This integration supports GET only", 405));
  }
  return next();
}, authenticateIntegration, limiter, (req, _res, next) => {
  if (Object.keys(req.query).length || Object.keys(req.body || {}).length) {
    return next(new AppError("This endpoint does not accept filters or a request body", 400));
  }
  return next();
}, asyncHandler(async (req, res) => {
  const data = await repository.listEmployeeLeadCounts(req.leadCountIntegration.companyId);
  res.json({ success: true, data, meta: { fetched_at: new Date().toISOString() } });
}));

module.exports = router;
