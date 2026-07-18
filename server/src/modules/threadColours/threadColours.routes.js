const express = require("express");
const controller = require("./threadColours.controller");

const router = express.Router();

router.get("/thread-colours", controller.listThreadColours);

module.exports = router;
