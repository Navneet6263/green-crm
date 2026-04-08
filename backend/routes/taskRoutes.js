const express = require("express");

const authenticate = require("../middlewares/authenticate");
const asyncHandler = require("../utils/asyncHandler");
const taskController = require("../controllers/taskController");

const router = express.Router();

router.use(asyncHandler(authenticate));

router.get("/", asyncHandler(taskController.list));
router.post("/", asyncHandler(taskController.create));
router.get("/:taskId", asyncHandler(taskController.getOne));
router.put("/:taskId", asyncHandler(taskController.update));
router.patch("/:taskId", asyncHandler(taskController.update));
router.delete("/:taskId", asyncHandler(taskController.remove));

module.exports = router;
