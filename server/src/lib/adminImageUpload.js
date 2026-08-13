const multer = require("multer");

// Admin catalogue images (product/category photos) go straight to
// NocoDB's per-cell attachment-upload API (airtable-client.js#uploadAttachment)
// — no local copy is kept, so memory storage is enough. Separate from
// attachments.upload.js (customer quote files), which uses disk storage
// and a much broader type allowlist for design uploads.
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB — a realistic per-file ceiling

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

// Multer errors (bad mimetype, oversized file) otherwise fall through to
// the generic error handler as a 500 — surface them as a clean 400,
// matching attachments.upload.js's pattern.
module.exports = function adminImageUpload(req, res, next) {
  singleImageUpload(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
};
