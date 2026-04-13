const express = require("express");

const authenticate = require("../middlewares/authenticate");
const asyncHandler = require("../utils/asyncHandler");
const teamController = require("../controllers/teamController");

const router = express.Router();

router.use(asyncHandler(authenticate));

router.get("/", asyncHandler(teamController.list));
router.post("/", asyncHandler(teamController.create));
router.get("/:teamId", asyncHandler(teamController.getOne));
router.get("/:teamId/assignable-users", asyncHandler(teamController.listAssignableUsers));
router.put("/:teamId", asyncHandler(teamController.update));
router.patch("/:teamId", asyncHandler(teamController.update));
router.post("/:teamId/members", asyncHandler(teamController.addMember));
router.delete("/:teamId/members/:userId", asyncHandler(teamController.removeMember));
router.post("/:teamId/managers", asyncHandler(teamController.addManager));
router.delete("/:teamId/managers/:userId", asyncHandler(teamController.removeManager));

module.exports = router;
