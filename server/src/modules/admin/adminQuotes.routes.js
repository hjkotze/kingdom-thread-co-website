const express = require("express");
const controller = require("./adminQuotes.controller");
const { requireRole } = require("../../middleware/requireAuth");

const router = express.Router();

router.use(requireRole("admin"));
router.get("/", controller.list);
router.get("/:id", controller.getOne);
router.post("/:id/messages", controller.reply);

module.exports = router;
