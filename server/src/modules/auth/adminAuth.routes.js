const express = require("express");
const controller = require("./auth.controller");
const { rateLimit } = require("../../lib/rateLimit");

// Admin-only login. Deliberately a separate router/path from customer auth
// (§1: "an admin login should not be reachable from the customer-facing
// UI") — there is intentionally no admin self-registration endpoint; admin
// accounts are created via server/scripts/create-admin.js.
const router = express.Router();

// Own rate-limit bucket, separate from customer login — this is the
// higher-value target for brute-forcing, worth limiting independently of
// customer-login traffic from the same IP.
router.post("/login", rateLimit("admin-login", { max: 10, windowMinutes: 15 }), controller.loginAdmin);
router.post("/logout", controller.logout);
router.get("/me", controller.me);

module.exports = router;
