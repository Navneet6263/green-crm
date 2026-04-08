const express = require("express");

const authenticate = require("../middlewares/authenticate");
const asyncHandler = require("../utils/asyncHandler");
const workflowController = require("../controllers/workflowController");

const router = express.Router();

router.use(asyncHandler(authenticate));

router.get("/my-assigned", asyncHandler(workflowController.myAssigned));
router.get("/tracker", asyncHandler(workflowController.tracker));
router.get("/my-history", asyncHandler(workflowController.myHistory));
router.get("/users/:role", asyncHandler(workflowController.usersByRole));
router.post("/:leadId/transfer-to-legal", asyncHandler(workflowController.transferToLegal));
router.post("/:leadId/transfer-to-finance", asyncHandler(workflowController.transferToFinance));
router.post("/:leadId/complete", asyncHandler(workflowController.complete));
router.post("/:leadId/legal/upload", asyncHandler(workflowController.uploadLegal));
router.post("/:leadId/finance/upload", asyncHandler(workflowController.uploadFinance));
router.delete("/:leadId/legal/delete/:docId", asyncHandler(workflowController.deleteLegal));
router.delete("/:leadId/finance/delete/:docId", asyncHandler(workflowController.deleteFinance));
router.post("/send-document-email", asyncHandler(workflowController.sendDocumentEmail));

module.exports = router;
