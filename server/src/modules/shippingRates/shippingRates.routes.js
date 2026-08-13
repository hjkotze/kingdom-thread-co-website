const express = require("express");
const controller = require("./shippingRates.controller");
const { requireRole } = require("../../middleware/requireAuth");

const router = express.Router();

router.use(requireRole("admin"));
router.get("/", controller.list);
router.post("/", controller.create);
router.patch("/:id", controller.update);
router.delete("/:id", controller.remove);

module.exports = router;
