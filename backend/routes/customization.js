const express = require("express");
const router = express.Router();
const authenticate = require("../middlewares/authenticate");
const authorize = require("../middlewares/authorize");
const customizationController = require("../controllers/customizationController");

// Get company customization settings
router.get(
  "/",
  authenticate,
  customizationController.getCustomization
);

// Update company customization settings
router.put(
  "/",
  authenticate,
  authorize("super-admin", "admin"),
  customizationController.updateCustomization
);

module.exports = router;
