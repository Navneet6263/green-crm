const express = require("express");

const authenticate = require("../middlewares/authenticate");
const asyncHandler = require("../utils/asyncHandler");
const productController = require("../controllers/productController");

const router = express.Router();

router.use(asyncHandler(authenticate));

router.get("/", asyncHandler(productController.list));
router.post("/", asyncHandler(productController.create));
router.put("/:productId", asyncHandler(productController.update));
router.patch("/:productId", asyncHandler(productController.update));
router.delete("/:productId", asyncHandler(productController.remove));

module.exports = router;
