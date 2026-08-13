const express = require("express");
const controller = require("./adminQuotes.controller");
const { requireRole } = require("../../middleware/requireAuth");

const router = express.Router();

router.use(requireRole("admin"));
router.get("/", controller.list);
router.get("/:id", controller.getOne);
router.post("/:id/messages", controller.reply);
router.post("/:id/snapshots", controller.createSnapshot);
router.post("/:id/snapshots/send", controller.sendSnapshot);
router.get("/:id/quote-pdf", controller.downloadQuotePdf);

module.exports = router;
