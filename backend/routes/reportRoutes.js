const express = require("express");
const authenticate = require("../middlewares/authenticate");
const asyncHandler = require("../utils/asyncHandler");
const { createRateLimiter } = require("../middlewares/rateLimiter");
const auditRepository = require("../repositories/auditRepository");
const { createPrefixedId } = require("../utils/ids");
const personReport = require("../services/reports/personReport");

const router = express.Router();
router.use(asyncHandler(authenticate));

router.get("/person/:userId", asyncHandler(async (req, res) => {
  res.json({ data: await personReport.getPersonReport(req.auth, req.params.userId, req.query) });
}));

router.get("/person/:userId/excel", createRateLimiter({ windowMs: 60000, max: 6, keyGenerator: (req) => `person-report:${req.auth.companyId}:${req.auth.userId}` }), asyncHandler(async (req, res) => {
  const { buffer, range, person, filename } = await personReport.buildPersonExcel(req.auth, req.params.userId, req.query);
  await auditRepository.createLog({
    audit_id: await createPrefixedId("aud"), company_id: req.auth.companyId, action: "report.person_exported",
    performed_by: req.auth.userId, user_email: req.auth.email, user_role: req.auth.role, target_user: person.user_id,
    details: { from: range.from, to: range.to, all: Boolean(range.all) },
  });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-store");
  res.send(Buffer.from(buffer));
}));

module.exports = router;
