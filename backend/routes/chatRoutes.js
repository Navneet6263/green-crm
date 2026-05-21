const express = require("express");
const authenticate = require("../middlewares/authenticate");
const asyncHandler = require("../utils/asyncHandler");
const chatController = require("../controllers/chatController");

const router = express.Router();

// SSE stream doesn't require wrapper format
router.get(
  "/stream",
  (req, res, next) => {
    if (req.query.token) {
      req.headers.authorization = `Bearer ${req.query.token}`;
    }
    next();
  },
  asyncHandler(authenticate),
  chatController.stream
);

router.use(asyncHandler(authenticate));

router.get("/active", asyncHandler(chatController.listChats));
router.get("/messages/:id", asyncHandler(chatController.getMessages));
router.get("/users", asyncHandler(chatController.listUsers));
router.post("/send", asyncHandler(chatController.sendMessage));
router.post("/group", asyncHandler(chatController.createGroup));
router.post("/typing", asyncHandler(chatController.sendTypingStatus));

module.exports = router;
