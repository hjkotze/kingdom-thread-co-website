const express = require("express");
const controller = require("./adminOrders.controller");
const { requireRole } = require("../../middleware/requireAuth");

const router = express.Router();

router.use(requireRole("admin"));
router.get("/", controller.list);
router.patch("/:id/status", controller.updateStatus);

module.exports = router;
