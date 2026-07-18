const express = require("express");
const controller = require("./auth.controller");

// Admin-only login. Deliberately a separate router/path from customer auth
// (§1: "an admin login should not be reachable from the customer-facing
// UI") — there is intentionally no admin self-registration endpoint; admin
// accounts are created via server/scripts/create-admin.js.
const router = express.Router();

router.post("/login", controller.loginAdmin);
router.post("/logout", controller.logout);
router.get("/me", controller.me);

module.exports = router;
