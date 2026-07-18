const db = require("../../config/db");

class AttachmentError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Shared by upload + download: resolves the quote and checks the requester
// is either its owning customer or an admin. Used by both roles since the
// admin dashboard (a later phase) also needs to view/download attachments.
async function getAuthorizedQuote(quoteId, session) {
  const quote = await db("quotes").where({ id: quoteId }).first();
  if (!quote) throw new AttachmentError("Quote not found", 404);

  const isOwner = quote.customer_id === session.userId;
  const isAdmin = session.role === "admin";
  if (!isOwner && !isAdmin) throw new AttachmentError("Quote not found", 404); // 404, not 403 — don't reveal existence

  if (!quote.customisable_snapshot) {
    throw new AttachmentError("File uploads are only available for customisable products.", 403);
  }

  return quote;
}

async function getCurrentAttachment(quoteId, fileType) {
  return db("attachments").where({ quote_id: quoteId, file_type: fileType, is_current: true }).first();
}

async function createAttachment({ quoteId, fileType, originalFilename, storagePath, mimeType, sizeBytes, uploadedBy }) {
  return db.transaction(async (trx) => {
    await trx("attachments")
      .where({ quote_id: quoteId, file_type: fileType, is_current: true })
      .update({ is_current: false });

    const [id] = await trx("attachments").insert({
      quote_id: quoteId,
      file_type: fileType,
      original_filename: originalFilename,
      storage_path: storagePath,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      uploaded_by: uploadedBy,
      is_current: true,
    });

    return trx("attachments").where({ id }).first();
  });
}

async function listAttachmentsForQuote(quoteId) {
  return db("attachments").where({ quote_id: quoteId }).orderBy("created_at", "desc");
}

async function getAttachmentById(quoteId, attachmentId) {
  return db("attachments").where({ id: attachmentId, quote_id: quoteId }).first();
}

function attachmentRowToPublic(row) {
  return {
    id: row.id,
    fileType: row.file_type,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    uploadedBy: row.uploaded_by,
    isCurrent: Boolean(row.is_current),
    createdAt: row.created_at,
  };
}

module.exports = {
  AttachmentError,
  getAuthorizedQuote,
  getCurrentAttachment,
  createAttachment,
  listAttachmentsForQuote,
  getAttachmentById,
  attachmentRowToPublic,
};
