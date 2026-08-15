const express = require("express");
const controller = require("./adminCategories.controller");
const { requireRole } = require("../../middleware/requireAuth");
const adminImageUpload = require("../../lib/adminImageUpload");

const router = express.Router();

router.use(requireRole("admin"));
router.get("/", controller.list);
router.get("/:id", controller.getOne);
router.post("/", controller.create);
router.patch("/:id", controller.update);
router.delete("/:id", controller.destroy);
router.post("/:id/images", adminImageUpload, controller.addImage);
router.delete("/:id/images/:attachmentId", controller.removeImage);
router.put("/:id/images/order", controller.reorderImages);

module.exports = router;
