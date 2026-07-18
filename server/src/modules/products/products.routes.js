const express = require("express");
const controller = require("./products.controller");

// Public — no auth required to browse the catalogue.
const router = express.Router();

router.get("/categories", controller.listCategories);
router.get("/products", controller.listProducts);

module.exports = router;
