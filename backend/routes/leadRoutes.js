const express = require("express");

const authenticate = require("../middlewares/authenticate");
const asyncHandler = require("../utils/asyncHandler");
const leadController = require("../controllers/leadController");

const router = express.Router();

router.use(asyncHandler(authenticate));

router.get("/", asyncHandler(leadController.list));
router.post("/", asyncHandler(leadController.create));
router.get("/my-leads", asyncHandler(leadController.listMyLeads));
router.get("/stats/products", asyncHandler(leadController.productStats));
router.get("/user/product-history", asyncHandler(leadController.productHistory));
router.post("/assign", asyncHandler(leadController.assign));
router.get("/product/:productId", asyncHandler(leadController.listByProduct));
router.get("/reminders", asyncHandler(leadController.reminders));
router.post("/bulk-upload", asyncHandler(leadController.bulkUpload));

router.get("/:leadId", asyncHandler(leadController.getOne));
router.put("/:leadId", asyncHandler(leadController.update));
router.patch("/:leadId", asyncHandler(leadController.update));
router.delete("/:leadId", asyncHandler(leadController.remove));
router.post("/:leadId/assign", asyncHandler(leadController.assign));
router.get("/:leadId/notes", asyncHandler(leadController.notes));
router.post("/:leadId/notes", asyncHandler(leadController.addNote));
router.get("/:leadId/activity", asyncHandler(leadController.activities));
router.get("/:leadId/activities", asyncHandler(leadController.activities));
router.post("/:leadId/activity", asyncHandler(leadController.addActivity));
router.post("/:leadId/activities", asyncHandler(leadController.addActivity));

module.exports = router;
