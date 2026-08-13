const multer = require("multer");
const sharp = require("sharp");

// Admin catalogue images (product/category photos) go straight to
// NocoDB's per-cell attachment-upload API (airtable-client.js#uploadAttachment)
// — no local copy is kept, so memory storage is enough. Separate from
// attachments.upload.js (customer quote files), which uses disk storage
// and a much broader type allowlist for design uploads.
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB — a realistic per-file ceiling

// Every catalogue image (category/product) is displayed at well under this
// on every breakpoint (see ProductCategories.jsx/Shop.jsx's fixed-height,
// object-cover boxes), so anything bigger than this on its longest edge is
// pure waste — typically a raw phone/camera photo shrunk down visually by
// CSS but still fully downloaded by every visitor at its original size.
const MAX_DIMENSION_PX = 1600;

const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error("Only PNG, JPG, or WEBP images are allowed."));
    }
    cb(null, true);
  },
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES, files: 1 },
});

const singleImageUpload = upload.single("image");

// Caps the longest edge at MAX_DIMENSION_PX (never enlarges smaller images —
// withoutEnlargement) and re-encodes at a slightly lossy quality. Keeps the
// original format so nothing downstream (which reads req.file.mimetype)
// needs to change.
async function resizeInPlace(file) {
  const format = file.mimetype.split("/")[1]; // "png" | "jpeg" | "webp"
  const options = format === "png" ? { compressionLevel: 8 } : { quality: 82 };
  file.buffer = await sharp(file.buffer)
    .resize({ width: MAX_DIMENSION_PX, height: MAX_DIMENSION_PX, fit: "inside", withoutEnlargement: true })
    .toFormat(format, options)
    .toBuffer();
  file.size = file.buffer.length;
}

// Multer errors (bad mimetype, oversized file) otherwise fall through to
// the generic error handler as a 500 — surface them as a clean 400,
// matching attachments.upload.js's pattern.
module.exports = function adminImageUpload(req, res, next) {
  singleImageUpload(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return next();
    try {
      await resizeInPlace(req.file);
      next();
    } catch (resizeErr) {
      res.status(400).json({ error: `Could not process image: ${resizeErr.message}` });
    }
  });
};
