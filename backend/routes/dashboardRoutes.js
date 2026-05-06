const express = require("express");

const authenticate = require("../middlewares/authenticate");
const asyncHandler = require("../utils/asyncHandler");
const dashboardController = require("../controllers/dashboardController");

const router = express.Router();

router.use(asyncHandler(authenticate));
router.get("/summary", asyncHandler(dashboardController.summary));

// Widget-level endpoints — each loads independently for lazy/parallel rendering
router.get("/widgets/kpis", asyncHandler(dashboardController.widgetKpis));
router.get("/widgets/leads", asyncHandler(dashboardController.widgetLeads));
router.get("/widgets/tasks", asyncHandler(dashboardController.widgetTasks));
router.get("/widgets/charts", asyncHandler(dashboardController.widgetCharts));

module.exports = router;
