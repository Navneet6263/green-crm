const express = require("express");

const authRoutes = require("./authRoutes");
const attendanceRoutes = require("./attendanceRoutes");
const auditRoutes = require("./auditRoutes");
const capabilitiesRoutes = require("./capabilitiesRoutes");
const companyRoutes = require("./companyRoutes");
const communicationsRoutes = require("./communicationsRoutes");
const customerRoutes = require("./customerRoutes");
const userRoutes = require("./userRoutes");
const productRoutes = require("./productRoutes");
const teamRoutes = require("./teamRoutes");
const leadRoutes = require("./leadRoutes");
const taskRoutes = require("./taskRoutes");
const workflowRoutes = require("./workflowRoutes");
const notificationRoutes = require("./notificationRoutes");
const demoRequestRoutes = require("./demoRequestRoutes");
const superAdminRoutes = require("./superAdminRoutes");
const dashboardRoutes = require("./dashboardRoutes");
const noteRoutes = require("./noteRoutes");
const recentActivityRoutes = require("./recentActivityRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/audit-logs", auditRoutes);
router.use("/capabilities", capabilitiesRoutes);
router.use("/companies", companyRoutes);
router.use("/communications", communicationsRoutes);
router.use("/customers", customerRoutes);
router.use("/users", userRoutes);
router.use("/products", productRoutes);
router.use("/teams", teamRoutes);
router.use("/leads", leadRoutes);
router.use("/tasks", taskRoutes);
router.use("/workflow", workflowRoutes);
router.use("/notifications", notificationRoutes);
router.use("/demo-requests", demoRequestRoutes);
router.use("/super-admin", superAdminRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/notes", noteRoutes);
router.use("/recent-activity", recentActivityRoutes);

module.exports = router;
