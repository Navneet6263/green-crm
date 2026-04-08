const express = require("express");

const authenticate = require("../middlewares/authenticate");
const asyncHandler = require("../utils/asyncHandler");
const superAdminController = require("../controllers/superAdminController");

const router = express.Router();

router.use(asyncHandler(authenticate));

router.get("/users", asyncHandler(superAdminController.listUsers));
router.post("/create-super-admin", asyncHandler(superAdminController.createSuperAdmin));
router.put("/deactivate/:userId", asyncHandler(superAdminController.deactivate));
router.put("/activate/:userId", asyncHandler(superAdminController.activate));
router.put("/reset-password/:userId", asyncHandler(superAdminController.resetPassword));
router.get("/safety-status", asyncHandler(superAdminController.safetyStatus));

module.exports = router;
