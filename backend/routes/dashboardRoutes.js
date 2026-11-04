const express = require("express");

const authenticate = require("../middlewares/authenticate");
const asyncHandler = require("../utils/asyncHandler");
const dashboardController = require("../controllers/dashboardController");

const router = express.Router();

router.use(asyncHandler(authenticate));
router.get("/summary", asyncHandler(dashboardController.summary));

// One dashboard for every role: widgets are chosen by the viewer, data stays within their scope.
router.get("/insights", asyncHandler(async (req, res) => {
  res.json({ data: await require("../services/dashboard/insightsService").getInsights(req.auth, req.query) });
}));
router.get("/custom", asyncHandler(async (req, res) => {
  res.json({ data: await require("../services/dashboard/insightsService").getCustomChart(req.auth, req.query) });
}));
router.get("/report/columns", (req, res) => {
  res.json({ data: require("../services/dashboard/dashboardReport").reportCatalog(req.auth.role) });
});
router.get("/report", require("../middlewares/rateLimiter").createRateLimiter({ windowMs: 60000, max: 6, keyGenerator: (req) => `dashboard-report:${req.auth.companyId}:${req.auth.userId}` }), asyncHandler(async (req, res) => {
  const { buffer, range } = await require("../services/dashboard/dashboardReport").buildDashboardReport(req.auth, req.query);
  await require("../repositories/auditRepository").createLog({
    audit_id: await require("../utils/ids").createPrefixedId("aud"),
    company_id: req.auth.companyId,
    action: "dashboard.report_exported",
    performed_by: req.auth.userId,
    user_email: req.auth.email,
    user_role: req.auth.role,
    target_user: req.query.assigned_to || null,
    details: { from: range.from, to: range.to, sheets: req.query.sheets || "default" },
  });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="GreenCRM-dashboard-${range.all ? "all-time" : `${range.from}-to-${range.to}`}.xlsx"`);
  res.setHeader("Cache-Control", "no-store");
  res.send(Buffer.from(buffer));
}));
router.get("/performance", asyncHandler(async (req, res) => {
  res.json({ data: await require("../services/dashboardService").getPerformance(req.auth, req.query) });
}));

// Widget-level endpoints — each loads independently for lazy/parallel rendering
router.get("/widgets/kpis", asyncHandler(dashboardController.widgetKpis));
router.get("/widgets/leads", asyncHandler(dashboardController.widgetLeads));
router.get("/widgets/tasks", asyncHandler(dashboardController.widgetTasks));
router.get("/widgets/charts", asyncHandler(dashboardController.widgetCharts));

module.exports = router;
