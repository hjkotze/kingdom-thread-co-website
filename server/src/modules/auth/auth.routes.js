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
// Password reset is role-agnostic (works for customer or admin accounts by
// email — the reset token is the authorization, not which login form was
// used to reach it), so it lives here rather than duplicated under
// /admin/auth too. Same email-quota reasoning for the rate limit.
router.post("/forgot-password", rateLimit("forgot-password", { max: 5, windowMinutes: 60 }), controller.forgotPassword);
router.post("/reset-password", controller.resetPassword);
// Anti-brute-force, not anti-spam like the limits above — generous enough
// not to lock out a genuine customer mistyping their password a few times.
router.post("/login", rateLimit("customer-login", { max: 10, windowMinutes: 15 }), controller.loginCustomer);
router.post("/logout", controller.logout);
router.get("/me", controller.me);
router.patch("/profile", controller.updateProfile);

module.exports = router;
