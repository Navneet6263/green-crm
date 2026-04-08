const express = require("express");

const authenticate = require("../middlewares/authenticate");
const asyncHandler = require("../utils/asyncHandler");
const auditController = require("../controllers/auditController");

const router = express.Router();

router.use(asyncHandler(authenticate));
router.get("/", asyncHandler(auditController.list));

module.exports = router;
