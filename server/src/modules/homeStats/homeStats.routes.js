const express = require("express");
const controller = require("./homeStats.controller");

// Public — powers the Hero section's stats, no auth required.
const router = express.Router();

router.get("/home-stats", controller.getHomeStats);

module.exports = router;
