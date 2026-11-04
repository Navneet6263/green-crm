const express = require("express");
const authenticate = require("../middlewares/authenticate");
const asyncHandler = require("../utils/asyncHandler");
const { createRateLimiter } = require("../middlewares/rateLimiter");
const discuss = require("../services/discuss/discussService");
const hub = require("../services/discuss/discussHub");

const router = express.Router();

// EventSource cannot send headers, so the live stream takes the token in the URL.
router.get("/stream", (req, _res, next) => {
  if (req.query.token && !req.headers.authorization) req.headers.authorization = `Bearer ${req.query.token}`;
  next();
}, asyncHandler(authenticate), (req, res) => hub.connect(req, res));

router.use(asyncHandler(authenticate));

const sendLimit = createRateLimiter({ windowMs: 60000, max: 60, keyGenerator: (req) => `discuss:${req.auth.companyId}:${req.auth.userId}` });
const ok = (fn) => asyncHandler(async (req, res) => res.json({ data: await fn(req) }));

router.get("/chats", ok((req) => discuss.listChats(req.auth)));
router.get("/unread", ok((req) => discuss.unreadTotal(req.auth)));
router.get("/messages", ok((req) => discuss.getMessages(req.auth, req.query)));
router.post("/messages", sendLimit, ok((req) => discuss.sendMessage(req.auth, req.body)));
router.patch("/messages/:id", ok((req) => discuss.editMessage(req.auth, req.params.id, req.body)));
router.delete("/messages/:id", ok((req) => discuss.deleteMessage(req.auth, req.params.id)));
router.post("/read", ok((req) => discuss.markRead(req.auth, req.body)));
router.post("/typing", ok((req) => discuss.typing(req.auth, req.body)));
router.post("/groups", ok((req) => discuss.createGroup(req.auth, req.body)));
router.patch("/groups/:id", ok((req) => discuss.updateGroup(req.auth, req.params.id, req.body)));
router.post("/groups/:id/leave", ok((req) => discuss.leaveGroup(req.auth, req.params.id)));
router.delete("/groups/:id", ok((req) => discuss.archiveGroup(req.auth, req.params.id)));

module.exports = router;
