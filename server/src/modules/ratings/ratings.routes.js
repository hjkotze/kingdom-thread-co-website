const express = require("express");
const controller = require("./ratings.controller");
const { requireRole } = require("../../middleware/requireAuth");

// Mounted at /products/:id/rating (mergeParams to see :id). Summary is
// public — the same tier as product browsing; "mine" and submitting
// require a customer session.
const router = express.Router({ mergeParams: true });

router.get("/", controller.getSummary);
router.get("/me", requireRole("customer"), controller.getMine);
router.post("/", requireRole("customer"), controller.submit);

module.exports = router;
