const express = require("express");

const authenticate = require("../middlewares/authenticate");
const asyncHandler = require("../utils/asyncHandler");
const superAdminController = require("../controllers/superAdminController");
const { getOverview } = require("../services/superAdmin/platformOverview");

const router = express.Router();

router.use(asyncHandler(authenticate));

router.get("/users", asyncHandler(superAdminController.listUsers));
router.post("/create-super-admin", asyncHandler(superAdminController.createSuperAdmin));
router.put("/deactivate/:userId", asyncHandler(superAdminController.deactivate));
router.put("/activate/:userId", asyncHandler(superAdminController.activate));
router.put("/reset-password/:userId", asyncHandler(superAdminController.resetPassword));
router.put("/users/:userId/role", asyncHandler(superAdminController.updateTenantRole));
router.get("/safety-status", asyncHandler(superAdminController.safetyStatus));
// Platform dashboard: every tenant's numbers in one call (?days=7|30|90).
router.get("/overview", asyncHandler(async (req, res) => res.json({ data: await getOverview(req.auth, req.query) })));

module.exports = router;
