const express = require("express");
const controller = require("./categories.controller");

// Public — no auth required to browse the catalogue. Moved out of
// products.routes.js when Categories became its own module (admin CRUD) —
// same URL (GET /api/categories), no frontend-visible change.
const router = express.Router();

router.get("/categories", controller.listCategories);

module.exports = router;
