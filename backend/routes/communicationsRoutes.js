const express = require("express");

const authenticate = require("../middlewares/authenticate");
const asyncHandler = require("../utils/asyncHandler");
const communicationsController = require("../controllers/communicationsController");

const router = express.Router();

router.post(
  "/webhooks/:channel/:provider",
  asyncHandler(communicationsController.handleWebhook)
);

router.use(asyncHandler(authenticate));

router.post("/send", asyncHandler(communicationsController.send));
router.post("/email", asyncHandler(communicationsController.send));
router.post("/test-email", asyncHandler(communicationsController.sendTestEmail));
router.post("/call", asyncHandler(communicationsController.call));
router.post("/whatsapp", asyncHandler(communicationsController.sendWhatsapp));
router.post("/sms", asyncHandler(communicationsController.sendSms));

module.exports = router;
