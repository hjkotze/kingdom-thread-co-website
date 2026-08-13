const express = require("express");
const controller = require("./orders.controller");
const { requireRole } = require("../../middleware/requireAuth");

// Mounted at /account/orders — customer-scoped combine/accept flow.
const router = express.Router();

router.use(requireRole("customer"));
router.get("/eligible", controller.listEligible);
router.get("/summary-counts", controller.summaryCounts);
router.get("/", controller.listMine);
router.post("/", controller.create);

module.exports = router;
