const express = require("express");
const controller = require("./attachments.controller");
const uploadMiddleware = require("./attachments.upload");
const { requireAuth } = require("../../middleware/requireAuth");

// Mounted at /quotes/:quoteId/attachments (mergeParams to see :quoteId).
// requireAuth only (not role-locked) — authorizeQuote allows either the
// owning customer or an admin, since the admin dashboard (a later phase)
// needs the same download endpoint.
const router = express.Router({ mergeParams: true });

router.use(requireAuth);
router.use(controller.authorizeQuote);

router.get("/", controller.list);
router.post("/", uploadMiddleware, controller.upload);
router.get("/:attachmentId/download", controller.download);

module.exports = router;
