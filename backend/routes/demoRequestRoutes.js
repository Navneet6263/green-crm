const express = require("express");

const authenticate = require("../middlewares/authenticate");
const asyncHandler = require("../utils/asyncHandler");
const demoRequestController = require("../controllers/demoRequestController");

const router = express.Router();

router.post("/", asyncHandler(demoRequestController.create));
router.get("/", asyncHandler(authenticate), asyncHandler(demoRequestController.list));
router.patch("/:id", asyncHandler(authenticate), asyncHandler(demoRequestController.update));

module.exports = router;
