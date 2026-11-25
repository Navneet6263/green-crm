const express = require("express");

const authenticate = require("../middlewares/authenticate");
const { requireModule } = require("../middlewares/requireModule");
const asyncHandler = require("../utils/asyncHandler");
const attendanceController = require("../controllers/attendanceController");

const router = express.Router();

router.use(asyncHandler(authenticate));
router.use(requireModule("attendance"));
router.get("/history", asyncHandler(attendanceController.getHistory));
router.get("/status", asyncHandler(attendanceController.getStatus));
router.post("/punch", asyncHandler(attendanceController.punch));

module.exports = router;
