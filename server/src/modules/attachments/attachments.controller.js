const fs = require("fs");
const path = require("path");
const service = require("./attachments.service");
const { isAllowedMimeType, contentMatchesDeclaredType } = require("../../lib/fileValidation");

async function authorizeQuote(req, res, next) {
  try {
    req.quote = await service.getAuthorizedQuote(req.params.quoteId, req.session);
    next();
  } catch (err) {
    if (err instanceof service.AttachmentError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

async function upload(req, res, next) {
  const file = req.file;
  try {
    const fileType = req.body?.type;
    if (fileType !== "image" && fileType !== "text") {
      throw new service.AttachmentError('type must be "image" or "text".', 400);
    }
    if (!file) throw new service.AttachmentError("No file uploaded.", 400);

    if (!isAllowedMimeType(fileType, file.mimetype)) {
      throw new service.AttachmentError(`Invalid file type for ${fileType} upload.`, 400);
    }

    const headBuffer = await fs.promises.readFile(file.path).then((buf) => buf.subarray(0, 512));
    if (!contentMatchesDeclaredType(headBuffer, file.mimetype)) {
      throw new service.AttachmentError("File content doesn't match its declared type.", 400);
    }

    const existing = await service.getCurrentAttachment(req.quote.id, fileType);
    if (existing && req.body?.confirmOverwrite !== "true") {
      throw new service.AttachmentError("An upload of this type already exists — confirmation required.", 409);
    }

    const attachment = await service.createAttachment({
      quoteId: req.quote.id,
      fileType,
      originalFilename: file.originalname,
      storagePath: file.path,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      uploadedBy: req.session.role === "admin" ? "company" : "customer",
    });

    res.status(201).json({ attachment: service.attachmentRowToPublic(attachment) });
  } catch (err) {
    if (file) await fs.promises.unlink(file.path).catch(() => {});

    if (err instanceof service.AttachmentError) {
      if (err.statusCode === 409) {
        const existing = await service.getCurrentAttachment(req.quote.id, req.body.type);
        return res.status(409).json({
          error: err.message,
          existing: existing ? service.attachmentRowToPublic(existing) : null,
        });
      }
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const attachments = await service.listAttachmentsForQuote(req.quote.id);
    res.json({ attachments: attachments.map(service.attachmentRowToPublic) });
  } catch (err) {
    next(err);
  }
}

async function download(req, res, next) {
  try {
    const attachment = await service.getAttachmentById(req.quote.id, req.params.attachmentId);
    if (!attachment) return res.status(404).json({ error: "Attachment not found" });

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Type", attachment.mime_type);
    // Always forces a download rather than inline rendering — the main
    // mitigation against stored-XSS via a malicious SVG upload ever being
    // navigated to directly as a top-level document.
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(attachment.original_filename)}"`,
    );
    res.sendFile(path.resolve(attachment.storage_path));
  } catch (err) {
    next(err);
  }
}

module.exports = { authorizeQuote, upload, list, download };
