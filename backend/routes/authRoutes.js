const express = require("express");

const authenticate = require("../middlewares/authenticate");
const { authRateLimiter } = require("../middlewares/rateLimiter");
const asyncHandler = require("../utils/asyncHandler");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/register", authRateLimiter, asyncHandler(authController.register));
router.post("/login", authRateLimiter, asyncHandler(authController.login));
router.post("/forgot-password", authRateLimiter, asyncHandler(authController.forgotPassword));
router.post("/reset-password", authRateLimiter, asyncHandler(authController.resetPassword));
router.get("/super-admin-status", asyncHandler(authController.superAdminStatus));

router.use(asyncHandler(authenticate));

router.get("/check-auth", asyncHandler(authController.checkAuth));
router.post("/logout", asyncHandler(authController.logout));
router.get("/verify", asyncHandler(authController.verify));
router.get("/me", asyncHandler(authController.me));
router.get("/profile", asyncHandler(authController.me));
router.put("/profile", asyncHandler(authController.updateProfile));
router.put("/change-password", asyncHandler(authController.changePassword));
router.get("/users", asyncHandler(authController.listUsers));
router.post("/create-employee", asyncHandler(authController.createEmployee));
router.put("/users/:id/toggle", asyncHandler(authController.toggleUser));
router.put("/users/:id", asyncHandler(authController.updateUser));
router.delete("/users/:id", asyncHandler(authController.deleteUser));

module.exports = router;
