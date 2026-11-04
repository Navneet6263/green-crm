const express = require("express");

const authenticate = require("../middlewares/authenticate");
const asyncHandler = require("../utils/asyncHandler");
const customerController = require("../controllers/customerController");

const router = express.Router();

router.use(asyncHandler(authenticate));

router.get("/", asyncHandler(customerController.list));
router.post("/", asyncHandler(customerController.create));
// Excel: pick sheets and columns, same as the Leads report.
router.get("/export/columns", (req, res) => res.json({ data: require("../services/customers/customerExport").customerExportCatalog() }));
router.get("/export", require("../middlewares/rateLimiter").createRateLimiter({ windowMs: 60000, max: 6, keyGenerator: (req) => `customer-export:${req.auth.companyId}:${req.auth.userId}` }), asyncHandler(async (req, res) => {
  const { buffer, count } = await require("../services/customers/customerExport").buildCustomerWorkbook(req.auth, req.query, { filters: String(req.query.filter_label || "").slice(0, 200), generatedBy: req.auth.name });
  await require("../repositories/auditRepository").createLog({
    audit_id: await require("../utils/ids").createPrefixedId("aud"), company_id: req.auth.companyId, action: "customer.exported",
    performed_by: req.auth.userId, user_email: req.auth.email, user_role: req.auth.role, details: { count, sheets: req.query.sheets || "default" },
  });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="GreenCRM-customers-${new Date().toISOString().slice(0, 10)}.xlsx"`);
  res.setHeader("Cache-Control", "no-store");
  res.send(Buffer.from(buffer));
}));
router.get("/:customerId", asyncHandler(customerController.getOne));
// Money received and the onboarding checklist.
const money = () => require("../services/customers/customerMoney");
const onboarding = () => require("../services/customers/customerOnboarding");
router.get("/:customerId/money", asyncHandler(async (req, res) => res.json({ data: await money().getMoney(req.auth, req.params.customerId) })));
router.post("/:customerId/payments", asyncHandler(async (req, res) => res.status(201).json({ data: await money().addPayment(req.auth, req.params.customerId, req.body) })));
router.delete("/:customerId/payments/:paymentId", asyncHandler(async (req, res) => res.json({ data: await money().deletePayment(req.auth, req.params.customerId, req.params.paymentId) })));
router.patch("/:customerId/billing", asyncHandler(async (req, res) => res.json({ data: await money().updateBilling(req.auth, req.params.customerId, req.body) })));
router.get("/:customerId/onboarding", asyncHandler(async (req, res) => res.json({ data: await onboarding().getOnboarding(req.auth, req.params.customerId) })));
router.post("/:customerId/onboarding/steps", asyncHandler(async (req, res) => res.status(201).json({ data: await onboarding().addStep(req.auth, req.params.customerId, req.body) })));
router.patch("/:customerId/onboarding/steps/:stepId", asyncHandler(async (req, res) => res.json({ data: await onboarding().updateStep(req.auth, req.params.customerId, req.params.stepId, req.body) })));
router.delete("/:customerId/onboarding/steps/:stepId", asyncHandler(async (req, res) => res.json({ data: await onboarding().removeStep(req.auth, req.params.customerId, req.params.stepId) })));
router.put("/:customerId", asyncHandler(customerController.update));
router.patch("/:customerId", asyncHandler(customerController.update));
router.delete("/:customerId", asyncHandler(customerController.remove));
router.post("/:customerId/notes", asyncHandler(customerController.addNote));
router.post("/:customerId/followups", asyncHandler(customerController.addFollowUp));
router.get("/:customerId/members", asyncHandler(customerController.listMembers));
router.post("/:customerId/members", asyncHandler(customerController.addMember));
router.delete("/:customerId/members/:userId", asyncHandler(customerController.removeMember));
router.get("/:customerId/activities", asyncHandler(customerController.listActivities));
router.get("/:customerId/subscriptions", asyncHandler(customerController.listSubscriptions));
router.post("/:customerId/subscriptions", asyncHandler(customerController.addSubscription));

module.exports = router;
