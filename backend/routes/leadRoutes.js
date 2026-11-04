const express = require("express");

const authenticate = require("../middlewares/authenticate");
const asyncHandler = require("../utils/asyncHandler");
const callLogController = require("../controllers/callLogController");
const leadController = require("../controllers/leadController");
const leadService = require("../services/leadService");
const auditRepository = require("../repositories/auditRepository");
const { createRateLimiter } = require("../middlewares/rateLimiter");
const { createPrefixedId } = require("../utils/ids");
const { loadLeadExport, buildLeadWorkbook, leadExportCatalog } = require("../services/leads/leadExport");
const { parseImportFile, buildImportTemplate } = require("../services/leads/leadImport");
const AppError = require("../utils/appError");

const router = express.Router();

router.use(asyncHandler(authenticate));
router.use('/:leadId/photos', require('./fieldPhotoRoutes'));

const exportLimiter = createRateLimiter({ windowMs: 60000, max: 6, keyGenerator: (req) => `lead-export:${req.auth.companyId}:${req.auth.userId}` });

router.get("/", asyncHandler(leadController.list));
router.get("/counts", asyncHandler(async (req, res) => {
  res.json({ data: await leadService.getLeadCounts(req.auth, req.query) });
}));
router.post("/bulk-update", asyncHandler(async (req, res) => {
  res.json({ data: await leadService.bulkUpdateLeads(req.auth, req.body) });
}));

// Bulk upload: read the file, check the rows, then the normal bulk-upload route saves them.
const importLimiter = createRateLimiter({ windowMs: 60000, max: 20, keyGenerator: (req) => `lead-import:${req.auth.companyId}:${req.auth.userId}` });
router.get("/import/template", asyncHandler(async (req, res) => {
  const buffer = await buildImportTemplate();
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="GreenCRM-lead-upload-template.xlsx"');
  res.send(Buffer.from(buffer));
}));
router.post("/import/parse", importLimiter, express.raw({ type: () => true, limit: "10mb" }), asyncHandler(async (req, res) => {
  if (!["super-admin", "platform-admin", "platform-manager", "admin", "manager", "marketing"].includes(req.auth.role)) {
    throw new AppError("Your role cannot bulk import leads.", 403);
  }
  res.json({ data: await parseImportFile(req.body, decodeURIComponent(String(req.headers["x-file-name"] || ""))) });
}));
router.post("/import/check", asyncHandler(async (req, res) => {
  res.json({ data: await leadService.checkBulkImport(req.auth, req.body) });
}));

// Excel download of the filtered leads, with the sheets and columns the user picked.
router.get("/export/columns", (req, res) => res.json({ data: leadExportCatalog() }));
router.get("/export", exportLimiter, asyncHandler(async (req, res) => {
  const data = await loadLeadExport(req.auth, req.query);
  const appUrl = String(process.env.FRONTEND_URL || "").split(",")[0].trim().replace(/\/$/, "");
  const buffer = await buildLeadWorkbook(data, { appUrl, filters: String(req.query.filter_label || "").slice(0, 200), generatedBy: req.auth.name || req.auth.email || "GreenCRM user" }, req.query);
  await auditRepository.createLog({
    audit_id: await createPrefixedId("aud"),
    company_id: req.auth.companyId,
    action: "leads.exported",
    performed_by: req.auth.userId,
    user_email: req.auth.email,
    user_role: req.auth.role,
    target_user: null,
    details: { leads: data.leads.length, sheets: req.query.sheets || "default" },
  });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="GreenCRM-leads-${new Date(Date.now() + 19800000).toISOString().slice(0, 10)}.xlsx"`);
  res.setHeader("Cache-Control", "no-store");
  res.send(Buffer.from(buffer));
}));
router.get("/analytics", asyncHandler(async (req, res) => {
  const data = await require("../services/leadService").getAnalytics(req.auth, req.query);
  res.json({ data });
}));
// Pipeline page Excel: the column picker, then the workbook.
router.get("/analytics/report/columns", (req, res) => {
  res.json({ data: require("../services/pipeline/pipelineReport").reportCatalog(req.auth.role) });
});
router.get("/analytics/report", require("../middlewares/rateLimiter").createRateLimiter({ windowMs: 60000, max: 6, keyGenerator: (req) => `pipeline-report:${req.auth.companyId}:${req.auth.userId}` }), asyncHandler(async (req, res) => {
  const { buffer } = await require("../services/pipeline/pipelineReport").buildPipelineReport(req.auth, req.query);
  await require("../repositories/auditRepository").createLog({
    audit_id: await require("../utils/ids").createPrefixedId("aud"), company_id: req.auth.companyId, action: "pipeline.report_exported",
    performed_by: req.auth.userId, user_email: req.auth.email, user_role: req.auth.role, target_user: null,
    details: { sheets: req.query.sheets || "default", range: req.query.range || "month" },
  }).catch(() => {});
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="GreenCRM-pipeline-${new Date(Date.now() + 19800000).toISOString().slice(0, 10)}.xlsx"`);
  res.setHeader("Cache-Control", "no-store");
  res.send(Buffer.from(buffer));
}));
router.get("/analytics/focus", asyncHandler(async (req, res) => {
  const data = await require("../services/leadService").getAnalytics(req.auth, req.query, true);
  res.json({ data });
}));
router.post("/", asyncHandler(leadController.create));
router.get("/my-leads", asyncHandler(leadController.listMyLeads));
router.get("/my-day", asyncHandler(async (req, res) => {
  res.json(await require("../services/leadService").getMyDay(req.auth, req.query));
}));
router.get("/stats/products", asyncHandler(leadController.productStats));
router.get("/user/product-history", asyncHandler(leadController.productHistory));
router.post("/assign", asyncHandler(leadController.assign));
router.get("/product/:productId", asyncHandler(leadController.listByProduct));
router.get("/reminders", asyncHandler(leadController.reminders));
router.post("/bulk-upload", asyncHandler(leadController.bulkUpload));

router.get("/deleted", asyncHandler(async (req, res) => {
  res.json({ data: await require("../services/leads/deletedLeads").listDeletedLeads(req.auth, req.query) });
}));
router.post("/:leadId/restore", asyncHandler(async (req, res) => {
  res.json({ data: await require("../services/leads/deletedLeads").restoreLead(req.auth, req.params.leadId, req.body) });
}));
router.get("/:leadId", asyncHandler(leadController.getOne));
router.put("/:leadId", asyncHandler(leadController.update));
router.patch("/:leadId", asyncHandler(leadController.update));
router.delete("/:leadId", asyncHandler(leadController.remove));
router.post("/:leadId/convert-to-customer", asyncHandler(leadController.convertToCustomer));
router.post("/:leadId/assign", asyncHandler(leadController.assign));
router.get("/:leadId/assignments", asyncHandler(leadController.assignments));
router.put("/:leadId/assignments", asyncHandler(leadController.updateAssignments));
router.delete("/:leadId/assignments/:userId", asyncHandler(leadController.removeAssignment));
router.get("/:leadId/calls", asyncHandler(callLogController.listLeadCalls));
router.get("/:leadId/documents", asyncHandler(leadController.documents));
router.post(
  "/:leadId/documents/upload",
  express.raw({ type: () => true, limit: "10mb" }),
  asyncHandler(leadController.uploadDocument)
);
router.get("/:leadId/notes", asyncHandler(leadController.notes));
router.post("/:leadId/notes", asyncHandler(leadController.addNote));
router.get("/:leadId/activity", asyncHandler(leadController.activities));
router.get("/:leadId/activities", asyncHandler(leadController.activities));
router.post("/:leadId/activity", asyncHandler(leadController.addActivity));
router.post("/:leadId/activities", asyncHandler(leadController.addActivity));

module.exports = router;
