// Allowlists + lightweight content sniffing for customer file uploads.
// Declared Content-Type headers are trivially spoofable, so image uploads
// (the type most likely to end up rendered somewhere) are also checked
// against real magic bytes after landing on disk. Text/doc formats are
// lower-risk and more varied in structure, so those rely on the
// mimetype+extension allowlist alone — proportionate for a small
// low-traffic quoting tool rather than a general file-sharing product.

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB, matches the original UI copy

const IMAGE_TYPES = {
  "image/png": {
    ext: "png",
    sniff: (buf) => buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47,
  },
  "image/jpeg": {
    ext: "jpg",
    sniff: (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  },
  "image/webp": {
    ext: "webp",
    sniff: (buf) => buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP",
  },
  "image/svg+xml": {
    ext: "svg",
    sniff: (buf) => {
      const head = buf.subarray(0, 300).toString("utf8").trimStart().toLowerCase();
      return head.startsWith("<?xml") || head.startsWith("<svg");
    },
  },
};

const TEXT_TYPES = {
  "text/plain": { ext: "txt" },
  "application/pdf": {
    ext: "pdf",
    sniff: (buf) => buf.length >= 4 && buf.toString("ascii", 0, 4) === "%PDF",
  },
  "application/msword": { ext: "doc" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { ext: "docx" },
};

const ALL_TYPES = { ...IMAGE_TYPES, ...TEXT_TYPES };

function isAllowedMimeType(fileType, mimeType) {
  const table = fileType === "image" ? IMAGE_TYPES : TEXT_TYPES;
  return Boolean(table[mimeType]);
}

function extensionFor(mimeType) {
  return ALL_TYPES[mimeType]?.ext || "bin";
}

// Reads a small chunk of the file and checks it against the declared
// mimetype's magic bytes, when we have a sniffer for that type.
function contentMatchesDeclaredType(buffer, mimeType) {
  const entry = ALL_TYPES[mimeType];
  if (!entry || !entry.sniff) return true; // no sniffer for this type — trust the allowlist check
  return entry.sniff(buffer);
}

module.exports = {
  MAX_SIZE_BYTES,
  isAllowedMimeType,
  extensionFor,
  contentMatchesDeclaredType,
};
