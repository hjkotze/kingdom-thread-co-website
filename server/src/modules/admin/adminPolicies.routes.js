const express = require("express");
const controller = require("./adminPolicies.controller");
const { requireRole } = require("../../middleware/requireAuth");

const router = express.Router();

router.use(requireRole("admin"));
router.get("/:type", controller.getOne);
router.patch("/:type", controller.update);

module.exports = router;
