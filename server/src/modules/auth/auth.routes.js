const express = require("express");
const controller = require("./auth.controller");
const { rateLimit } = require("../../lib/rateLimit");

// Customer-facing auth. Mounted at /api/auth — this is the only auth surface
// linked from the customer UI.
const router = express.Router();

// Registration and resend both send an email through our own limited-quota
// mailbox (see DEV_CREDENTIALS.md — the test mailbox caps at 10/day) —
// capped per IP so this can't be used to exhaust it or spam a real inbox.
router.post("/register", rateLimit("register", { max: 5, windowMinutes: 60 }), controller.register);
router.post(
  "/resend-verification",
  rateLimit("resend-verification", { max: 5, windowMinutes: 60 }),
  controller.resendVerification,
);
router.post("/verify-email", controller.verifyEmail);
router.post("/login", controller.loginCustomer);
router.post("/logout", controller.logout);
router.get("/me", controller.me);

module.exports = router;
