const express = require("express");
const controller = require("./quotes.controller");
const { requireRole } = require("../../middleware/requireAuth");

// All quote endpoints are customer-scoped and ownership-checked in the
// service layer (getQuoteForCustomer/listQuotesForCustomer only ever touch
// rows belonging to req.session.userId).
const router = express.Router();

router.use(requireRole("customer"));
router.post("/", controller.create);
router.get("/", controller.list);
router.get("/:id", controller.getOne);
router.post("/:id/accept", controller.accept);

module.exports = router;
