const express = require("express");

const authenticate = require("../middlewares/authenticate");
const asyncHandler = require("../utils/asyncHandler");
const taskController = require("../controllers/taskController");
const { createRateLimiter } = require("../middlewares/rateLimiter");
const auditRepository = require("../repositories/auditRepository");
const { createPrefixedId } = require("../utils/ids");
const { loadExport, buildTaskWorkbook, exportCatalog } = require("../services/tasks/taskExport");

const router = express.Router();

router.use(asyncHandler(authenticate));

const exportLimiter = createRateLimiter({ windowMs: 60000, max: 6, keyGenerator: (req) => `task-export:${req.auth.companyId}:${req.auth.userId}` });

router.get("/", asyncHandler(taskController.list));

// Excel download of tasks and lead follow-ups, with the sheets and columns the user picked.
router.get("/export/columns", (req, res) => res.json({ data: exportCatalog() }));
router.get("/export", exportLimiter, asyncHandler(async (req, res) => {
  const data = await loadExport(req.auth, req.query);
  const filters = [];
  if (req.query.mine === "1") filters.push(`Assigned to ${req.auth.name || "me"}`);
  else if (req.query.assigned_to) filters.push(`Assigned to ${data.tasks[0]?.assigned_to_name || "one person"}`);
  else if (req.query.team_ids) filters.push(`Team: ${data.tasks[0]?.team_name || "selected team"}`);
  if (data.status !== "all") filters.push(`${data.status[0].toUpperCase()}${data.status.slice(1)} only`);
  const appUrl = String(process.env.FRONTEND_URL || "").split(",")[0].trim().replace(/\/$/, "");
  const buffer = await buildTaskWorkbook(data, { filters, appUrl, generatedBy: req.auth.name || req.auth.email || "GreenCRM user" }, req.query);
  await auditRepository.createLog({
    audit_id: await createPrefixedId("aud"),
    company_id: req.auth.companyId,
    action: "tasks.exported",
    performed_by: req.auth.userId,
    user_email: req.auth.email,
    user_role: req.auth.role,
    target_user: req.query.assigned_to || null,
    details: { from: data.from || null, to: data.to || null, tasks: data.tasks.length, followups: data.followups.length, status: data.status },
  });
  const name = data.from ? `${data.from}${data.to && data.to !== data.from ? `-to-${data.to}` : ""}` : "all";
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="GreenCRM-tasks-${name}.xlsx"`);
  res.setHeader("Cache-Control", "no-store");
  res.send(Buffer.from(buffer));
}));
router.post("/", asyncHandler(taskController.create));
router.get("/:taskId", asyncHandler(taskController.getOne));
router.put("/:taskId", asyncHandler(taskController.update));
router.patch("/:taskId", asyncHandler(taskController.update));
router.delete("/:taskId", asyncHandler(taskController.remove));

module.exports = router;
