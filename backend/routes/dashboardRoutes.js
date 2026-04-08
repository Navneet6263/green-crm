const express = require("express");

const authenticate = require("../middlewares/authenticate");
const asyncHandler = require("../utils/asyncHandler");
const dashboardController = require("../controllers/dashboardController");

const router = express.Router();

router.use(asyncHandler(authenticate));
router.get("/summary", asyncHandler(dashboardController.summary));

module.exports = router;
