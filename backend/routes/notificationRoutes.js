const express = require("express");

const authenticate = require("../middlewares/authenticate");
const asyncHandler = require("../utils/asyncHandler");
const notificationController = require("../controllers/notificationController");

const router = express.Router();

router.use(asyncHandler(authenticate));

router.get("/", asyncHandler(notificationController.list));
router.patch("/:notifId/read", asyncHandler(notificationController.markRead));

module.exports = router;
