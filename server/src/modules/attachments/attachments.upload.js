const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const env = require("../../config/env");
const { MAX_SIZE_BYTES, isAllowedMimeType, extensionFor } = require("../../lib/fileValidation");

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const dir = path.join(env.uploadsDir, String(req.params.quoteId));
      await fs.promises.mkdir(dir, { recursive: true });
      cb(null, dir);
    } catch (err) {
      cb(err);
    }
  },
  // Generated filename only — original_filename (user-supplied) is stored
  // separately in the DB for display, never used to build a filesystem
  // path (avoids path traversal / collisions).
  filename: (req, file, cb) => {
    cb(null, `${crypto.randomUUID()}.${extensionFor(file.mimetype)}`);
  },
});

function fileFilter(req, file, cb) {
  // req.body.type may not be parsed yet at this point in the multipart
  // stream — this only rejects obviously disallowed mimetypes up front.
  // The authoritative type+content check happens after upload completes,
  // once req.body is fully available (see attachments.controller.js).
  const allowed = isAllowedMimeType("image", file.mimetype) || isAllowedMimeType("text", file.mimetype);
  if (!allowed) return cb(new Error("Unsupported file type."));
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_BYTES, files: 1 },
});

const singleFileUpload = upload.single("file");

// Multer errors (bad mimetype, oversized file) otherwise fall through to
// the generic error handler as a 500 — surface them as a clean 400.
module.exports = function uploadMiddleware(req, res, next) {
  singleFileUpload(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
};
