const express = require("express");
const controller = require("./policies.controller");

// Mounted at /policies — deliberately no auth middleware, these are
// public legal documents (linked from the footer, checkout, and
// registration, none of which require a session).
const router = express.Router();

router.get("/:type", controller.getOne);

module.exports = router;
