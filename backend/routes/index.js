const express = require("express");

const authRoutes = require("./authRoutes");
const auditRoutes = require("./auditRoutes");
const companyRoutes = require("./companyRoutes");
const communicationsRoutes = require("./communicationsRoutes");
const customerRoutes = require("./customerRoutes");
const userRoutes = require("./userRoutes");
const productRoutes = require("./productRoutes");
const leadRoutes = require("./leadRoutes");
const taskRoutes = require("./taskRoutes");
const workflowRoutes = require("./workflowRoutes");
const notificationRoutes = require("./notificationRoutes");
const demoRequestRoutes = require("./demoRequestRoutes");
const superAdminRoutes = require("./superAdminRoutes");
const dashboardRoutes = require("./dashboardRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/audit-logs", auditRoutes);
router.use("/companies", companyRoutes);
router.use("/communications", communicationsRoutes);
router.use("/customers", customerRoutes);
router.use("/users", userRoutes);
router.use("/products", productRoutes);
router.use("/leads", leadRoutes);
router.use("/tasks", taskRoutes);
router.use("/workflow", workflowRoutes);
router.use("/notifications", notificationRoutes);
router.use("/demo-requests", demoRequestRoutes);
router.use("/super-admin", superAdminRoutes);
router.use("/dashboard", dashboardRoutes);

module.exports = router;
