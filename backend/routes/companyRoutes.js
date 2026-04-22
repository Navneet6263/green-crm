const express = require("express");

const authenticate = require("../middlewares/authenticate");
const asyncHandler = require("../utils/asyncHandler");
const communicationSettingsController = require("../controllers/company/communicationSettingsController");
const companyController = require("../controllers/companyController");
const productController = require("../controllers/productController");

const router = express.Router();

router.use(asyncHandler(authenticate));

router.get("/", asyncHandler(companyController.list));
router.post("/", asyncHandler(companyController.create));
router.get("/:companyId", asyncHandler(companyController.getOne));
router.get("/:companyId/stats", asyncHandler(companyController.stats));
router.get("/:companyId/communication-settings", asyncHandler(communicationSettingsController.getSettings));
router.patch("/:companyId", asyncHandler(companyController.update));
router.put("/:companyId", asyncHandler(companyController.update));
router.put("/:companyId/communication-settings", asyncHandler(communicationSettingsController.updateSettings));
router.delete("/:companyId", asyncHandler(companyController.remove));
router.post("/:companyId/products/:productId", asyncHandler(productController.enableForCompany));

module.exports = router;
