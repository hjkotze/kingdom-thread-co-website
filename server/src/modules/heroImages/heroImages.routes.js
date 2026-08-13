const express = require("express");
const controller = require("./heroImages.controller");

// Public — powers the Hero section's two images, no auth required.
const router = express.Router();

router.get("/hero-images", controller.listHeroImages);

module.exports = router;
