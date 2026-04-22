const express = require("express");

const authenticate = require("../middlewares/authenticate");
const asyncHandler = require("../utils/asyncHandler");
const capabilitiesController = require("../controllers/capabilitiesController");

const router = express.Router();

router.use(asyncHandler(authenticate));
router.get("/", asyncHandler(capabilitiesController.getCapabilities));

module.exports = router;
