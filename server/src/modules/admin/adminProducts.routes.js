const express = require("express");
const controller = require("./adminProducts.controller");
const shippingRatesController = require("../shippingRates/shippingRates.controller");
const { requireRole } = require("../../middleware/requireAuth");
const adminImageUpload = require("../../lib/adminImageUpload");

const router = express.Router();

router.use(requireRole("admin"));
router.get("/", controller.list);
router.get("/:id", controller.getOne);
router.post("/", controller.create);
router.patch("/:id", controller.update);
router.delete("/:id", controller.destroy);
router.post("/:id/image", adminImageUpload, controller.uploadImage);

// Local-only override (product_shipping_rates) — never round-tripped to
// Airtable, unlike everything else on a product. See shippingRates.service.js.
router.get("/:productId/shipping-rate", shippingRatesController.getProductOverride);
router.put("/:productId/shipping-rate", shippingRatesController.setProductOverride);

module.exports = router;
