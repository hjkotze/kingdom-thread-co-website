const express = require("express");
const authRoutes = require("../modules/auth/auth.routes");
const adminAuthRoutes = require("../modules/auth/adminAuth.routes");
const productsRoutes = require("../modules/products/products.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/admin/auth", adminAuthRoutes);
router.use("/", productsRoutes);

module.exports = router;
