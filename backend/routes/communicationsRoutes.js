const express = require("express");

const authenticate = require("../middlewares/authenticate");
const asyncHandler = require("../utils/asyncHandler");
const communicationsController = require("../controllers/communicationsController");

const router = express.Router();

router.use(asyncHandler(authenticate));

router.post("/send", asyncHandler(communicationsController.send));
router.post("/test-email", asyncHandler(communicationsController.sendTestEmail));

module.exports = router;
