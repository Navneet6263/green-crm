const express = require("express");

const authenticate = require("../middlewares/authenticate");
const asyncHandler = require("../utils/asyncHandler");
const customerController = require("../controllers/customerController");

const router = express.Router();

router.use(asyncHandler(authenticate));

router.get("/", asyncHandler(customerController.list));
router.post("/", asyncHandler(customerController.create));
router.get("/:customerId", asyncHandler(customerController.getOne));
router.put("/:customerId", asyncHandler(customerController.update));
router.patch("/:customerId", asyncHandler(customerController.update));
router.delete("/:customerId", asyncHandler(customerController.remove));
router.post("/:customerId/notes", asyncHandler(customerController.addNote));
router.post("/:customerId/followups", asyncHandler(customerController.addFollowUp));

module.exports = router;
