const express = require("express");
const controller = require("./vatRates.controller");
const { requireRole } = require("../../middleware/requireAuth");

const router = express.Router();

router.use(requireRole("admin"));
router.get("/", controller.list);
router.post("/", controller.create);

module.exports = router;
