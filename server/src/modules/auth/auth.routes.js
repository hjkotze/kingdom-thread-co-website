const express = require("express");
const controller = require("./auth.controller");

// Customer-facing auth. Mounted at /api/auth — this is the only auth surface
// linked from the customer UI.
const router = express.Router();

router.post("/register", controller.register);
router.post("/login", controller.loginCustomer);
router.post("/logout", controller.logout);
router.get("/me", controller.me);

module.exports = router;
