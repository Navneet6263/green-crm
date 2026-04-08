const express = require("express");

const authenticate = require("../middlewares/authenticate");
const asyncHandler = require("../utils/asyncHandler");
const userController = require("../controllers/userController");

const router = express.Router();

router.use(asyncHandler(authenticate));

router.get("/", asyncHandler(userController.list));
router.post("/", asyncHandler(userController.create));
router.put("/:userId", asyncHandler(userController.update));
router.put("/:userId/toggle", asyncHandler(userController.toggle));
router.delete("/:userId", asyncHandler(userController.remove));

module.exports = router;
